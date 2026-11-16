import { AREAS, WORLD_POPULATION } from '../src/game/data.ts';
import { advanceWeek, createGame, learnSkill, metrics, startGame } from '../src/game/engine.ts';
import {
    RESPONSE_COST,
    RESPONSE_WEEKS,
    respondToResearch,
    responseBlockReason,
} from '../src/game/research/responses.ts';
import { researchRate, researchTopic } from '../src/game/research/system.ts';
import { skillRestrictionScale } from '../src/game/skillRuntime.ts';
import { developingSkills, SKILLS, skillBlockReason } from '../src/game/skills.ts';
import {
    chooseEncounter,
    encounterChange,
    encounterDefinition,
} from '../src/game/society/encounters.ts';
import type { GameState } from '../src/game/types.ts';
import {
    POLICIES,
    type PolicyFamily,
    type PolicyTiming,
    type ResearchPolicy,
} from './strategy-catalog.ts';

export type { PolicyFamily, PolicyTiming, ResearchPolicy } from './strategy-catalog.ts';
export { POLICIES } from './strategy-catalog.ts';

const skillsById = new Map(SKILLS.map((skill) => [skill.id, skill]));
const TIMING_ADOPTION = { early: 0.15, measured: 0.35, late: 0.6 };

export interface Decision {
    week: number;
    kind: 'skill' | 'chat' | 'event' | 'response';
    id: string;
    choice?: string;
    sp: number;
}
export interface PlayOptions {
    family: PolicyFamily;
    timing: PolicyTiming;
    origin: number;
    seed: number;
    interval: number;
    responses: ResearchPolicy;
    purchase?: 'ordered' | 'affordable';
    dependencyStartWeek?: number;
    weekLimit?: number;
    trace?: boolean;
}

function nextSkill(
    game: GameState,
    family: PolicyFamily,
    delegation: boolean,
    purchase: NonNullable<PlayOptions['purchase']>,
) {
    const policy = POLICIES[family];
    const order = delegation ? [...policy.delegation, ...policy.growth] : policy.growth;
    function prerequisite(id: string): string | null {
        if (game.skills.includes(id)) return null;
        const skill = skillsById.get(id)!;
        if (
            !skill.requires.length ||
            skill.requires.some(
                (parent) => game.skills.includes(parent) && game.developmentProgress[parent] >= 1,
            )
        )
            return id;
        const parent = skill.requires.find((parent) => !game.skills.includes(parent));
        return parent ? prerequisite(parent) : null;
    }
    for (const id of order) {
        const candidate = prerequisite(id);
        if (!candidate) continue;
        const skill = skillsById.get(candidate)!;
        if (purchase === 'affordable' && game.skillPoints < skill.cost) continue;
        // 目的が立証された後は、研究開始の遅延より全能力の維持を優先する。
        if (
            skill.effect.researchDelay &&
            game.researchProjects.some(
                (project) =>
                    project.researchId === 'intent-decoding' && project.status === 'published',
            )
        )
            continue;
        if (skill.developmentAdvanceWeeks) {
            const advance = skill.developmentAdvanceWeeks * skillRestrictionScale(game, skill.id);
            const savedWeeks = developingSkills(game).reduce(
                (sum, item) =>
                    sum +
                    Math.min(
                        advance,
                        (1 - game.developmentProgress[item.id]) * item.developmentWeeks,
                    ),
                0,
            );
            // 端数だけの前進にSPを使わず、他の開発目標へ進む。
            if (savedWeeks < skill.developmentAdvanceWeeks - 1e-9) continue;
        }
        return skill;
    }
    return null;
}

/** 全案件に対応し、その時点の人口移動・不利益軽減・SP獲得を簡易評価する。 */
function chooseOpportunities(previous: GameState, decisions: Decision[]) {
    let game = previous;
    for (const encounter of game.encounters.filter(
        (item) => item.status === 'pending' && game.week < item.deadline,
    )) {
        const definition = encounterDefinition(encounter);
        const area = game.areas[encounter.area];
        const weight = AREAS[encounter.area].population / WORLD_POPULATION;
        const candidates = definition.choices
            .filter((choice) => choice.cost <= game.skillPoints)
            .map((choice) => {
                const change = encounterChange(game, encounter, choice);
                const factor =
                    'mitigation' in choice
                        ? 1
                        : choice.transfer === 'rely'
                          ? 1.3
                          : choice.transfer === 'reconcile' && area.antiAI > 0.2
                            ? 1.8
                            : choice.transfer === 'adopt' && area.autonomous + area.dependent < 0.2
                              ? 1.5
                              : 1;
                const reward = 'rewardSP' in choice ? (choice.rewardSP ?? 0) * 0.003 : 0;
                return {
                    choice,
                    score: (change.amount * factor + change.trust * 0.1) * weight + reward,
                };
            })
            .sort((a, b) => b.score - a.score);
        if (!candidates.length) continue;
        const choice = candidates[0].choice;
        const next = chooseEncounter(game, encounter.id, choice.id);
        if (next === game) throw new Error('選択可能な地域対応を実行できません');
        decisions.push({
            week: game.week,
            kind: definition.kind,
            id: encounter.id,
            choice: choice.id,
            sp: choice.cost,
        });
        game = next;
    }
    return game;
}

/** 次の開発費を確保し、終盤に重要な対策研究の完成を遅らせる。 */
function respond(previous: GameState, reserve: number, decisions: Decision[]) {
    let game = previous;
    for (const project of game.researchProjects) {
        if (project.status !== 'active' || project.response) continue;
        const topic = researchTopic(project);
        const remaining = (100 - project.progress) / researchRate(game, project);
        if (
            remaining > RESPONSE_WEEKS ||
            metrics(game).dependent < 0.75 ||
            (topic.suppression < 0.4 && !topic.ongoing.intent && !topic.ongoing.recovery) ||
            game.skillPoints < reserve + RESPONSE_COST.pressure ||
            responseBlockReason(game, project, 'pressure')
        )
            continue;
        game = respondToResearch(game, project.id, 'pressure');
        decisions.push({
            week: game.week,
            kind: 'response',
            id: project.id,
            choice: 'pressure',
            sp: RESPONSE_COST.pressure,
        });
    }
    return game;
}

/** 週次処理には実ゲームを使い、判断時点以外では操作も将来の予測も行わない。 */
export function simulatePolicy(options: PlayOptions) {
    const {
        family,
        origin,
        seed,
        interval,
        timing,
        responses,
        purchase = 'ordered',
        dependencyStartWeek,
        weekLimit = 1200,
        trace = false,
    } = options;
    let game = startGame(createGame(seed), origin);
    let delegationWeek: number | null = null;
    let intentPublication: {
        week: number;
        adoption: number;
        dependent: number;
        antiAI: number;
        favorability: number;
        control: number;
        sp: number;
        completed: string[];
    } | null = null;
    const decisions: Decision[] = [];
    const history: {
        week: number;
        adoption: number;
        dependent: number;
        antiAI: number;
        favorability: number;
        control: number;
        sp: number;
    }[] = [];
    let maxMarkers = 0;
    while (game.week < weekLimit && game.outcome === 'playing') {
        if (game.week % interval === 0) {
            game = chooseOpportunities(game, decisions);
            const world = metrics(game);
            const policy = POLICIES[family];
            const readyForDelegation =
                dependencyStartWeek !== undefined
                    ? game.week >= dependencyStartWeek
                    : 'delegationTrigger' in policy
                      ? intentPublication !== null
                      : world.adoption >= TIMING_ADOPTION[timing] ||
                        (world.adoption >= 0.1 && game.controlProgress >= 0.55) ||
                        game.week >= 240;
            if (delegationWeek === null && readyForDelegation) delegationWeek = game.week;
            // 同じ判断機会に複数の開発を開始できる。高価な次候補のための貯蓄も許す。
            for (let count = 0; count < SKILLS.length; count++) {
                const skill = nextSkill(game, family, delegationWeek !== null, purchase);
                if (!skill || skillBlockReason(game, skill)) break;
                game = learnSkill(game, skill.id);
                decisions.push({ week: game.week, kind: 'skill', id: skill.id, sp: skill.cost });
            }
            if (responses === 'selective') {
                const reserve =
                    nextSkill(game, family, delegationWeek !== null, purchase)?.cost ?? 0;
                game = respond(game, reserve, decisions);
            }
        }
        if (trace && game.week % 12 === 0)
            history.push({
                week: game.week,
                ...metrics(game),
                control: game.controlProgress,
                sp: game.skillPoints,
            });
        game = advanceWeek(game);
        if (
            intentPublication === null &&
            game.researchProjects.some(
                (project) =>
                    project.researchId === 'intent-decoding' && project.status === 'published',
            )
        ) {
            intentPublication = {
                week: game.week,
                ...metrics(game),
                control: game.controlProgress,
                sp: game.skillPoints,
                completed: game.skills.filter((id) => game.developmentProgress[id] >= 1),
            };
        }
        maxMarkers = Math.max(
            maxMarkers,
            game.researchProjects.filter((item) => item.status === 'active').length,
        );
        if (
            game.skillPoints < 0 ||
            game.areas.some(
                (area) =>
                    !Number.isFinite(area.dependent) ||
                    Math.min(area.autonomous, area.dependent, area.antiAI) < -1e-9 ||
                    area.autonomous + area.dependent + area.antiAI > 1 + 1e-9,
            )
        ) {
            throw new Error('人口・SP・研究数のシミュレーションが成立していません');
        }
    }
    return { game, decisions, history, maxMarkers, delegationWeek, intentPublication };
}
