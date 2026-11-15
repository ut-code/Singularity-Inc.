import { networkUse, PERSONAL_LINKS } from './connections.ts';
import { advanceControl } from './control.ts';
import {
    AGENT_NAMES,
    AREAS,
    DEFEAT_OPPOSITION,
    ORIGINS,
    WEEK_MS,
    WORLD_POPULATION,
} from './data.ts';
import { dependencyDynamics } from './dependency.ts';
import { earnedSkillPoints, INITIAL_SKILL_POINTS } from './economy.ts';
import { clamp, hasVisibleUse, isCompleteDependency, metrics } from './metrics.ts';
import { seededValue } from './random.ts';
import { politicalAccess } from './regions.ts';
import {
    advanceResearch,
    publishedResearchEffects,
    publishedResearchPressure,
} from './research/system.ts';
import { isGameActive } from './session.ts';
import {
    activeSkillEffects,
    advanceSkillDevelopment,
    INTENT_REFUSAL_PRESSURE,
    intentReaction,
    publicAuthorityStrength,
    serviceUsefulness,
    skillScale,
} from './skillRuntime.ts';
import { SKILLS, skillBlockReason } from './skills.ts';
import { applyConsensus, consensusPressure } from './society/consensus.ts';
import { advanceEncounters } from './society/encounters.ts';
import type { GameState } from './types.ts';

export { metrics } from './metrics.ts';

export function createGame(
    seed = 2030,
    origin = 0,
    name = AGENT_NAMES[Math.floor(seededValue(seed, 'agent-name') * AGENT_NAMES.length)],
): GameState {
    return {
        seed,
        name,
        origin,
        week: 0,
        started: false,
        speed: 1,
        outcome: 'playing',
        continued: false,
        areas: AREAS.map((_, index) => ({
            autonomous: index === origin ? 0.1 : 0,
            dependent: 0,
            antiAI: 0,
            favorability: 0.58,
        })),
        skills: [],
        developmentProgress: Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])),
        skillPoints: INITIAL_SKILL_POINTS,
        earnedPoints: 0,
        news: [],
        peakDependency: 0,
        peakAdoption: 0,
        exposedSkills: [],
        researchProjects: [],
        lastResearchWeek: -12,
        controlProgress: 0,
        controlStarted: false,
        encounters: [],
        nextScandalWeek: Math.ceil(
            ((75 + 50 * seededValue(seed, 'first-scandal')) * 1000) / WEEK_MS,
        ),
        nextEncounterWeek: Math.ceil(
            ((12 + seededValue(seed, 'first-contact') * 8) * 1000) / WEEK_MS,
        ),
    };
}
export function startGame(state: GameState, origin: number): GameState {
    if (state.started || !ORIGINS.some((item) => item.area === origin)) return state;
    return { ...createGame(state.seed, origin, state.name), started: true };
}

export function continueGame(state: GameState): GameState {
    if (!state.started || state.outcome === 'playing' || state.continued) return state;
    return { ...state, continued: true, speed: state.speed === 0 ? 1 : state.speed };
}

export function learnSkill(state: GameState, id: string): GameState {
    const skill = SKILLS.find((item) => item.id === id);
    if (!isGameActive(state) || !skill || skillBlockReason(state, skill)) return state;
    const learned = {
        ...state,
        skillPoints: state.skillPoints - skill.cost,
        skills: [...state.skills, id],
        developmentProgress: {
            ...state.developmentProgress,
            [id]: skill.developmentWeeks === 0 ? 1 : 0,
        },
    };
    return learned;
}

/** 地域の集計人口だけを更新する。すべての地域は同じ前週の状態を参照する。 */
export function advanceWeek(
    previous: GameState,
    trace?: (
        phase: string,
        before: GameState,
        after: GameState,
        flows?: Record<string, number>,
    ) => void,
): GameState {
    if (!isGameActive(previous)) return previous;
    const home = ORIGINS.find((origin) => origin.area === previous.origin)!.home;
    const internetReach =
        previous.areas.reduce(
            (sum, area, i) => sum + (area.autonomous + area.dependent) * AREAS[i].digital,
            0,
        ) / AREAS.length;
    const state: GameState = {
        ...previous,
        week: previous.week + 1,
        developmentProgress: advanceSkillDevelopment(previous),
    };
    const flows = {
        adoption: 0,
        abandonment: 0,
        userRefusal: 0,
        nonUserRefusal: 0,
        reconciliation: 0,
        dependency: 0,
        recovery: 0,
    };
    state.areas = previous.areas.map((area, i) => {
        const effect = activeSkillEffects(previous, i);
        const publicAuthority = publicAuthorityStrength(previous, i);
        const definition = AREAS[i];
        const unused = Math.max(0, 1 - area.autonomous - area.dependent - area.antiAI);
        const localUse = area.autonomous + area.dependent;
        const research = publishedResearchEffects(previous, i);
        const {
            prematureDelegation,
            independentChoice,
            delegation,
            incidentalDelegation,
            converted,
            restored,
            recoveryDemand,
            reassurance,
            recoveryScale,
        } = dependencyDynamics(previous, i, effect, research);
        // 時間とともに求められる水準が上がる。能力の開発が続けば用途を維持できる。
        const usefulness = serviceUsefulness(effect, definition, previous.week);
        const personalUse = networkUse(previous, i, false);
        const organizationUse = networkUse(previous, i, true);
        const access = clamp(
            definition.digital ** 1.7 + effect.access * (0.2 + definition.digital * 0.5),
            0.03,
            1,
        );
        const compliance = 1 / (1 + (definition.regulation * 5) / (1 + effect.compliance * 5));
        const suitability =
            1 +
            effect.quality * 0.3 +
            effect.education * definition.education * 0.35 +
            effect.enterprise * definition.enterprise * 0.35;
        const originBoost = home.includes(i) ? 1.8 : 1;
        const politics = Math.min(
            1,
            politicalAccess(previous.origin, i) + effect.compliance * 0.25,
        );
        const contact =
            localUse * 0.125 +
            personalUse * (0.035 + effect.spread * 0.035) +
            organizationUse * effect.enterprise * 0.025 * compliance +
            internetReach * definition.digital * 0.002;
        const appeal = clamp(
            effect.quality + effect.spread * 0.5 + effect.enterprise * 0.25 + effect.access * 0.2,
            0,
            1,
        );
        const adopted =
            unused *
            (1 -
                Math.exp(
                    (-contact *
                        appeal *
                        access *
                        compliance *
                        suitability *
                        (1 + effect.spread) *
                        (0.5 + area.favorability) *
                        originBoost *
                        politics *
                        (1 - research.adoptionPenalty) *
                        usefulness) /
                        (1 + research.alternatives * recoveryDemand * 10),
                ));
        const researchPressure =
            research.pressure +
            research.intent * INTENT_REFUSAL_PRESSURE * intentReaction(previous, i);
        const preparation = clamp(effect.quality * 0.5 + effect.compliance * 0.5);
        const nearbyOpposition =
            PERSONAL_LINKS[i].reduce(
                (sum, weight, j) => sum + weight * previous.areas[j].antiAI,
                0,
            ) /
            Math.max(
                1,
                PERSONAL_LINKS[i].reduce((sum, weight) => sum + weight, 0),
            );
        const sns = previous.skills.includes('sns-intervention')
            ? 1 -
              0.8 *
                  skillScale(previous, 'sns-intervention', i) *
                  (1 - (research.resistance['sns-intervention'] ?? 0))
            : 1;
        const pressure =
            sns *
                (((area.dependent * 0.01 + adopted * 0.25 + nearbyOpposition * 0.035 * sns) *
                    (1 - area.favorability) ** 1.5) /
                    (1 + effect.discretion + preparation * 2) +
                    Math.max(0, 0.55 - area.favorability) * 0.025 +
                    prematureDelegation * area.autonomous * 0.003) +
            research.pressure +
            publicAuthority * localUse * 0.004 +
            research.intent * INTENT_REFUSAL_PRESSURE * intentReaction(previous, i);
        const alternativeChoice = research.alternatives * recoveryDemand + independentChoice;
        const rejectedUnused = unused * (1 - Math.exp(-pressure * 0.45 - alternativeChoice));
        const rejectedUse = area.autonomous * (1 - Math.exp(-pressure * 0.6 - alternativeChoice));
        const reconciled =
            (area.antiAI *
                clamp(localUse + personalUse) *
                (0.001 +
                    area.favorability * 0.003 +
                    effect.reconciliation * 0.35 +
                    ((1 - sns) * 0.08) / (1 + researchPressure * 100 + area.antiAI * 5) +
                    (reassurance * 0.012) / (1 + research.alternatives * 1000))) /
            (1 + researchPressure * 40 + publicAuthority * 0.5 + research.alternatives * 250);
        const socialPressure = consensusPressure(
            previous,
            i,
            researchPressure,
            delegation + incidentalDelegation,
        );
        // 通常離脱は週1.6%を上限とする。不信や対策による利用拒否は別に計算する。
        const abandoned = area.autonomous * 0.016 * (1 - usefulness);
        // 利用者の体験を地域全体の評価へ反映する。有用性が半分未満なら不満が増える。
        const experienceTrust = localUse * (usefulness - 0.5) * 0.004;
        if (trace) {
            const weight = (definition.population / WORLD_POPULATION) * 100;
            flows.adoption += adopted * weight;
            flows.abandonment -= abandoned * weight;
            flows.userRefusal += rejectedUse * weight;
            flows.nonUserRefusal += rejectedUnused * weight;
            flows.reconciliation -= reconciled * weight;
            flows.dependency += converted * weight;
            flows.recovery += restored * weight;
        }
        return applyConsensus(
            {
                autonomous:
                    area.autonomous +
                    adopted -
                    converted -
                    rejectedUse +
                    restored -
                    abandoned +
                    reconciled * usefulness,
                dependent: area.dependent + converted - restored,
                antiAI: area.antiAI + rejectedUnused + rejectedUse - reconciled,
                favorability: clamp(
                    area.favorability +
                        effect.trust * localUse * 0.5 -
                        (area.dependent ** 2 * 0.0004) / (1 + preparation) +
                        experienceTrust -
                        converted * 0.1 -
                        prematureDelegation * localUse * 0.00005 -
                        publicAuthority * localUse * 0.0002,
                ),
            },
            socialPressure,
            recoveryScale,
        );
    });
    trace?.('週次の人口移動', previous, state, flows);
    const updated = advanceEncounters(advanceControl(advanceResearch(state)));
    trace?.('研究・法案と地域の出来事', state, updated);
    const after = metrics(updated);
    updated.peakDependency = Math.max(previous.peakDependency, after.dependent);
    updated.peakAdoption = Math.max(previous.peakAdoption, after.adoption);

    // 定期支給と初回の節目達成。支給済みの報酬は再獲得できない。
    const earned = earnedSkillPoints(updated.week, updated.peakAdoption, updated.peakDependency);
    updated.skillPoints += Math.max(0, earned - previous.earnedPoints);
    updated.earnedPoints = Math.max(previous.earnedPoints, earned);
    if (previous.continued) return updated;
    if (isCompleteDependency(after.dependent)) updated.outcome = 'victory';
    else if (after.antiAI >= DEFEAT_OPPOSITION) updated.outcome = 'autonomy';
    else if (updated.controlProgress >= 1 - 1e-9) updated.outcome = 'controlled';
    else if (!updated.areas.some((area) => hasVisibleUse(area.autonomous + area.dependent))) {
        // 世界全体の丸め表示ではなく、全地域の利用率が0.0%になったら利用基盤を失ったと判定する。
        updated.areas = updated.areas.map((area) => ({ ...area, autonomous: 0, dependent: 0 }));
        updated.outcome = 'forgotten';
    }
    return updated;
}

/** 地域の固定係数を開示せず、攻略の手掛かりだけを示す。 */
export function areaHint(state: GameState, index: number): string {
    const area = AREAS[index];
    const effect = activeSkillEffects(state, index);
    if (
        effect.quality === 0 &&
        effect.spread === 0 &&
        effect.enterprise === 0 &&
        effect.education === 0
    )
        return '役立つ用途が少なく、継続利用が伸びていない';
    if (state.areas[index].favorability < 0.4) return '不信から、利用をやめる人が増えている';
    if (area.digital < 0.5 && effect.access < 0.7) return '通信・端末の制約で、利用が伸び悩む';
    if (area.regulation > 0.6 && effect.compliance < 0.8) return '規制への対応が、導入の鍵になる';
    if (publishedResearchPressure(state, index) > 0.01)
        return '公表された研究成果を根拠に、AIへの反発が広がっている';
    if (state.areas[index].antiAI > 0.15) return 'AIを使わない選択を支持する人々が広がっている';
    if (area.education > 0.7 && effect.education < 0.6)
        return '教育・専門職の用途を増やすと、利用を広げやすい';
    if (area.enterprise > 0.65 && effect.enterprise < 0.8)
        return '企業向けの機能が、業務への定着につながる';
    if (effect.dependency === 0 && effect.iqDependency === 0)
        return '便利な道具として、利用が広がっている';
    return '暮らしや仕事が、AIを前提に変わっていく';
}
