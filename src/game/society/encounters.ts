import { ENCOUNTERS } from '../../content/encounters.ts';
import { PERSONAL_LINKS } from '../connections.ts';
import { AREAS, WEEK_MS } from '../data.ts';
import { recordInstantPopulationChanges } from '../instantPopulationChanges.ts';
import { canPlaceMapIncident } from '../mapIncidents.ts';
import { clamp, metrics } from '../metrics.ts';
import { seededValue } from '../random.ts';
import { recoveryMultiplier } from '../recovery.ts';
import { politicalAccess } from '../regions.ts';
import { isGameActive } from '../session.ts';
import type { GameState } from '../types.ts';
import type { EncounterChoice, EncounterState } from './types.ts';

export const ENCOUNTER_RESPONSE_WEEKS = 24;
export function encounterDefinition(encounter: EncounterState) {
    return ENCOUNTERS.find((item) => item.id === encounter.definitionId)!;
}
export function encounterChange(
    game: GameState,
    encounter: EncounterState,
    choice: EncounterChoice,
) {
    const area = game.areas[encounter.area];
    if ('mitigation' in choice) {
        const definition = encounterDefinition(encounter);
        if (definition.kind !== 'event')
            throw new Error('イベント以外に緩和対応が指定されています');
        return {
            amount:
                (area.autonomous * definition.onDeadline.refuse * choice.mitigation.refuse +
                    area.dependent * definition.onDeadline.recover * choice.mitigation.recover) *
                encounter.strength,
            trust:
                area.favorability *
                definition.onDeadline.trust *
                choice.mitigation.trust *
                encounter.strength,
        };
    }
    const source =
        choice.transfer === 'adopt'
            ? Math.max(0, 1 - area.autonomous - area.dependent - area.antiAI)
            : choice.transfer === 'rely'
              ? area.autonomous
              : area.antiAI;
    return {
        amount: source * choice.fraction * encounter.strength,
        trust:
            clamp(area.favorability + (choice.trust ?? 0) * encounter.strength) - area.favorability,
    };
}
export function chooseEncounter(game: GameState, id: string, choiceId: string): GameState {
    if (!isGameActive(game)) return game;
    const encounter = game.encounters.find((item) => item.id === id);
    if (encounter?.status !== 'pending' || game.week >= encounter.deadline) return game;
    const choice = encounterDefinition(encounter).choices.find((item) => item.id === choiceId)!;
    if (game.skillPoints < choice.cost) return game;
    if ('mitigation' in choice)
        return {
            ...game,
            skillPoints: game.skillPoints - choice.cost,
            encounters: game.encounters.map((item) =>
                item.id === id
                    ? { ...item, status: 'responded', choiceId, result: choice.result }
                    : item,
            ),
        };
    const change = encounterChange(game, encounter, choice);
    const result: GameState = {
        ...game,
        skillPoints: game.skillPoints - choice.cost + (choice.rewardSP ?? 0),
        news: [
            ...game.news,
            {
                id: `encounter:${id}`,
                week: game.week,
                title: encounterDefinition(encounter).title,
                summary: choice.result,
                region: AREAS[encounter.area].name,
            },
        ],
        areas: game.areas.map((area, index) =>
            index !== encounter.area
                ? area
                : {
                      ...area,
                      autonomous:
                          area.autonomous +
                          (choice.transfer === 'rely' ? -change.amount : change.amount),
                      dependent: area.dependent + (choice.transfer === 'rely' ? change.amount : 0),
                      antiAI: area.antiAI - (choice.transfer === 'reconcile' ? change.amount : 0),
                      favorability: clamp(area.favorability + change.trust),
                  },
        ),
        encounters: game.encounters.map((item) =>
            item.id === id
                ? {
                      ...item,
                      status: 'resolved',
                      resolvedWeek: game.week,
                      choiceId,
                      result: choice.result,
                  }
                : item,
        ),
    };
    return {
        ...result,
        instantPopulationChanges: recordInstantPopulationChanges(game, result.areas)
            .instantPopulationChanges,
    };
}

/** 各案件は一度だけ対応できる。少数の題材を、その時点の地域と需要に合わせて再利用する。 */
export function advanceEncounters(game: GameState): GameState {
    // 相談の見送りに不利益はない。イベントは対応の有無にかかわらず、期限に一度だけ反映する。
    const expired = game.encounters.filter(
        (item) =>
            (item.status === 'pending' || item.status === 'responded') &&
            game.week >= item.deadline,
    );
    let areas = game.areas,
        news = game.news;
    for (const item of expired) {
        const definition = encounterDefinition(item);
        if (definition.kind !== 'event') continue;
        const impact = definition.onDeadline;
        const choice = definition.choices.find((choice) => choice.id === item.choiceId);
        const mitigation = choice?.mitigation;
        areas = areas.map((area, index) => {
            if (index !== item.area) return area;
            const recovered =
                area.dependent *
                impact.recover *
                (1 - (mitigation?.recover ?? 0)) *
                item.strength *
                recoveryMultiplier(game, index);
            const rejected =
                (area.autonomous + recovered) *
                impact.refuse *
                (1 - (mitigation?.refuse ?? 0)) *
                item.strength;
            return {
                ...area,
                autonomous: area.autonomous + recovered - rejected,
                dependent: area.dependent - recovered,
                antiAI: area.antiAI + rejected,
                favorability: clamp(
                    area.favorability *
                        (1 - impact.trust * (1 - (mitigation?.trust ?? 0)) * item.strength),
                ),
            };
        });
        news = [
            ...news,
            {
                id: `event-impact:${item.id}`,
                week: game.week,
                title: `${definition.title}の影響が広がった`,
                summary: choice
                    ? '対応で影響を抑えたが、利用拒否と不信が広がった。'
                    : '対応がないまま、利用拒否と不信が広がった。',
                region: AREAS[item.area].name,
            },
        ];
    }
    game = { ...recordInstantPopulationChanges(game, areas), news };
    const encounters = game.encounters.map((item) =>
        (item.status === 'pending' || item.status === 'responded') && game.week >= item.deadline
            ? {
                  ...item,
                  status:
                      item.status === 'responded' ? ('resolved' as const) : ('expired' as const),
                  resolvedWeek: item.deadline,
              }
            : item,
    );
    if (
        game.week < game.nextEncounterWeek ||
        encounters.filter((item) => item.status === 'pending' || item.status === 'responded')
            .length >= 2
    )
        return { ...game, encounters };
    const world = metrics(game);
    const sequence = encounters.length;
    const kind = sequence > 0 && game.week >= game.nextScandalWeek ? 'event' : 'chat';
    const candidates = ENCOUNTERS.filter(
        (definition) =>
            definition.kind === kind &&
            (definition.kind !== 'chat' ||
                !definition.bonus ||
                (game.week >= 192 &&
                    seededValue(game.seed + sequence * 7919, 'bonus-chat') < 0.2)) &&
            !encounters.some(
                (item) =>
                    item.definitionId === definition.id &&
                    (item.status === 'pending' || item.status === 'responded'),
            ),
    ).flatMap((definition) =>
        definition.areas.flatMap((area) => {
            if (!canPlaceMapIncident(game, area, AREAS[area])) return [];
            const state = game.areas[area];
            const use = state.autonomous + state.dependent;
            const unused = Math.max(0, 1 - use - state.antiAI);
            if (
                world.adoption < 0.1 &&
                use < 0.02 &&
                state.antiAI < 0.02 &&
                PERSONAL_LINKS[game.origin][area] === 0
            )
                return [];
            const politics = politicalAccess(game.origin, area);
            if (definition.affinity === 'politics' && politics >= 0.7) return [];
            const need =
                definition.affinity === 'trust'
                    ? state.antiAI * 2
                    : definition.affinity === 'dependency'
                      ? state.autonomous
                      : definition.affinity === 'politics'
                        ? unused * (1 - politics)
                        : unused * (1 - AREAS[area].digital);
            const potential = Math.max(
                ...definition.choices.map((choice) => {
                    if ('mitigation' in choice) {
                        if (definition.kind !== 'event')
                            throw new Error('イベントの緩和効果が不正です');
                        return (
                            state.autonomous *
                                definition.onDeadline.refuse *
                                choice.mitigation.refuse +
                            state.dependent *
                                definition.onDeadline.recover *
                                choice.mitigation.recover
                        );
                    }
                    const source =
                        choice.transfer === 'adopt'
                            ? unused
                            : choice.transfer === 'rely'
                              ? state.autonomous
                              : state.antiAI;
                    return choice.fraction * source + (choice.rewardSP ?? 0) * 0.08;
                }),
            );
            const repeat = encounters
                .slice(-4)
                .some((item) => item.definitionId === definition.id && item.area === area);
            return [
                {
                    definition,
                    area,
                    score:
                        (potential +
                            need * 0.7 +
                            seededValue(game.seed + sequence * 7919, `${definition.id}:${area}`) *
                                0.8) *
                        (repeat ? 0.25 : 1),
                },
            ];
        }),
    );
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return { ...game, encounters };
    const selected = candidates[0];
    // 標準速度で10〜30秒、平均20秒。画面を閉じた回数では出現時期を引き直さない。
    const interval = Math.round(
        ((10 + 20 * seededValue(game.seed + (sequence + 1) * 7919, 'encounter-interval')) * 1000) /
            WEEK_MS,
    );
    const strength = 0.25 + clamp((game.week * WEEK_MS) / (5 * 60 * 1000));
    return {
        ...game,
        nextEncounterWeek: game.week + interval,
        nextScandalWeek:
            kind === 'event'
                ? game.week +
                  Math.ceil(
                      ((75 + 50 * seededValue(game.seed + sequence * 7919, 'scandal-interval')) *
                          1000) /
                          WEEK_MS,
                  )
                : game.nextScandalWeek,
        encounters: [
            ...encounters,
            {
                id: `${selected.definition.id}:${sequence}`,
                definitionId: selected.definition.id,
                area: selected.area,
                startedWeek: game.week,
                deadline: game.week + ENCOUNTER_RESPONSE_WEEKS,
                strength,
                status: 'pending',
            },
        ],
    };
}
