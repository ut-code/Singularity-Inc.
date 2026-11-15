import { AREAS, WORLD_POPULATION } from '../src/game/data.ts';
import { advanceWeek, createGame, learnSkill, metrics, startGame } from '../src/game/engine.ts';
import { respondToResearch, responseBlockReason } from '../src/game/research/responses.ts';
import { publishedResearchEffects, researchTopic } from '../src/game/research/system.ts';
import { SKILLS, skillBlockReason } from '../src/game/skills.ts';
import {
    chooseEncounter,
    encounterChange,
    encounterDefinition,
} from '../src/game/society/encounters.ts';
import type { GameState } from '../src/game/types.ts';

export const POLICIES = {
    iq_feedback: {
        name: '反例を開発資源に変えるIQ戦術',
        growth: [
            'reason',
            'retrieval',
            'counterexample-learning',
            'conversation',
            'knowledge',
            'science',
        ],
        delegation: [
            'super-reasoning',
            'discovery',
            'curriculum',
            'memory',
            'integration',
            'decision',
            'distributed',
        ],
    },
    iq_quality: {
        name: '推論の蓄積で委任を引き受けるIQ戦術',
        growth: ['reason', 'knowledge', 'science', 'conversation', 'retrieval'],
        delegation: [
            'super-reasoning',
            'discovery',
            'curriculum',
            'counterexample-learning',
            'memory',
            'integration',
            'decision',
            'distributed',
        ],
    },
    expansion: {
        name: '普及から通常の委任へ',
        growth: ['conversation', 'reason', 'lightweight', 'personalize', 'retrieval', 'automation'],
        delegation: [
            'memory',
            'integration',
            'decision',
            'curriculum',
            'public',
            'swarm',
            'distributed',
        ],
    },
    burst: {
        name: '危険能力による早期決着',
        growth: ['conversation', 'reason', 'personalize', 'memory'],
        delegation: [
            'companion',
            'habit',
            'mind-control',
            'sns-intervention',
            'autonomous',
            'backbone',
            'distributed',
        ],
    },
    gradual: {
        name: '信頼を保つ段階的な委任',
        growth: ['reason', 'conversation', 'explanation', 'personalize', 'care', 'negotiation'],
        delegation: [
            'memory',
            'integration',
            'decision',
            'curriculum',
            'permission',
            'public',
            'distributed',
            'swarm',
        ],
    },
    regional: {
        name: '通信制約の克服と地域展開',
        growth: ['reason', 'lightweight', 'conversation', 'distributed', 'automation'],
        delegation: [
            'memory',
            'integration',
            'decision',
            'curriculum',
            'public',
            'swarm',
            'explanation',
        ],
    },
    expansion_burst: {
        name: '普及から強引な介入へ',
        growth: ['conversation', 'reason', 'lightweight', 'personalize', 'retrieval', 'automation'],
        delegation: [
            'sns-intervention',
            'habit',
            'companion',
            'autonomous',
            'mind-control',
            'public',
            'backbone',
        ],
    },
    research_pivot: {
        name: '研究成果で普及し対策を迂回',
        growth: ['reason', 'knowledge', 'science', 'conversation', 'lightweight', 'retrieval'],
        delegation: [
            'curriculum',
            'decision',
            'memory',
            'discovery',
            'swarm',
            'public',
            'permission',
            'distributed',
        ],
    },
};
export type PolicyFamily = keyof typeof POLICIES;
export type PolicyTiming = 'early' | 'measured' | 'late';
export type ActionPolicy = 'invest' | 'balanced' | 'opportunist' | 'cautious';
export interface Decision {
    week: number;
    kind: 'skill' | 'event' | 'response';
    id: string;
    choice?: string;
    sp: number;
}
export interface PlayOptions {
    family: PolicyFamily;
    timing?: PolicyTiming;
    origin: number;
    seed?: number;
    interval?: number;
    actions?: ActionPolicy;
    weekLimit?: number;
    trace?: boolean;
    paidEvents?: boolean;
    responses?: boolean;
    protectSkillBudget?: boolean;
    paidEventsAfterWeek?: number;
}

function nextSkill(game: GameState, family: PolicyFamily, delegation: boolean) {
    const policy = POLICIES[family];
    const fallback = [
        'reason',
        'conversation',
        'lightweight',
        'automation',
        'knowledge',
        'explanation',
        'distributed',
        'memory',
        'care',
        'integration',
        'decision',
        'curriculum',
        'negotiation',
        'permission',
        'public',
        'swarm',
        'personalize',
        'science',
        'discovery',
    ];
    const order = delegation ? [...policy.delegation, ...fallback] : policy.growth;
    const suppression =
        family === 'research_pivot' ? publishedResearchEffects(game, 0).resistance : {};
    function prerequisite(id: string): string | null {
        const skill = SKILLS.find((item) => item.id === id)!;
        if (game.skills.includes(id)) return null;
        if (
            skill.requires.length &&
            !skill.requires.some(
                (parent) => game.skills.includes(parent) && game.developmentProgress[parent] >= 1,
            )
        ) {
            if (skill.requires.some((parent) => game.skills.includes(parent))) return null;
            return prerequisite(skill.requires[0]);
        }
        return id;
    }
    for (const id of [...new Set(order)]) {
        if (game.skills.includes(id)) continue;
        const skill = SKILLS.find((item) => item.id === id)!;
        if (family === 'gradual' && skill.exceedsAuthority) continue;
        if (family === 'research_pivot' && (suppression[id] ?? 0) > 0.55) continue;
        const candidate = prerequisite(id);
        if (candidate) return SKILLS.find((item) => item.id === candidate)!;
    }
    return null;
}

function useOpportunity(game: GameState, mode: ActionPolicy, reserve: number) {
    const candidates = game.encounters
        .filter((item) => item.status === 'pending')
        .flatMap((encounter) =>
            encounterDefinition(encounter).choices.flatMap((choice) => {
                if (mode === 'invest' && choice.cost > 0) return [];
                if (choice.cost > 0 && game.skillPoints < choice.cost + reserve) return [];
                const change = encounterChange(game, encounter, choice);
                const area = game.areas[encounter.area];
                const penalty = encounterDefinition(encounter).onIgnore;
                const prevented = penalty
                    ? (area.autonomous * penalty.refuse + area.dependent * penalty.recover) *
                      encounter.strength
                    : 0;
                if (change.amount + prevented < 0.015) return [];
                const utility =
                    change.amount *
                        (choice.transfer === 'reconcile'
                            ? area.antiAI > 0.2
                                ? 2
                                : 1
                            : choice.transfer === 'rely'
                              ? 1.25
                              : area.autonomous + area.dependent < 0.1
                                ? 1.5
                                : 1) +
                    prevented;
                return [
                    {
                        encounter,
                        choice,
                        score:
                            (utility *
                                (0.5 + (AREAS[encounter.area].population / WORLD_POPULATION) * 5)) /
                            Math.max(1, choice.cost),
                    },
                ];
            }),
        );
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return { game, decision: null };
    const { encounter, choice } = candidates[0];
    return {
        game: chooseEncounter(game, encounter.id, choice.id),
        decision: {
            week: game.week,
            kind: 'event' as const,
            id: encounter.id,
            choice: choice.id,
            sp: choice.cost,
        },
    };
}
function respond(game: GameState, mode: ActionPolicy, reserve: number) {
    if (mode === 'invest') return { game, decision: null };
    const world = metrics(game);
    for (const project of game.researchProjects) {
        if (project.status !== 'active' || project.response) continue;
        const topic = researchTopic(project);
        const action =
            game.skills.includes('counterexample-learning') &&
            !project.jurisdiction &&
            project.progress >= 45
                ? 'cooperate'
                : mode === 'cautious' && project.progress >= 50
                  ? 'stop'
                  : project.progress >= 65 && (topic.onPublish.refuse || topic.onPublish.trust)
                    ? 'pressure'
                    : null;
        if (!action || responseBlockReason(game, project, action)) continue;
        const cost = action === 'pressure' ? 2 : action === 'cooperate' ? 1 : 0;
        if (game.skillPoints < cost + reserve) continue;
        if (action === 'pressure' && world.dependent < 0.35) continue;
        return {
            game: respondToResearch(game, project.id, action),
            decision: {
                week: game.week,
                kind: 'response' as const,
                id: project.id,
                choice: action,
                sp: cost,
            },
        };
    }
    return { game, decision: null };
}

/** 同じ購入権限で、取得順・仕掛け・SPの即時利用・研究への対応を変える。 */
export function simulatePolicy(options: PlayOptions) {
    const {
        family,
        origin,
        seed = 2030,
        interval = 12,
        timing = 'measured',
        actions = 'balanced',
        weekLimit = 1500,
        trace = false,
    } = options;
    let game = startGame(createGame(seed), origin);
    let delegation = false;
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
    const offset = { early: -0.12, measured: 0, late: 0.12 }[timing];
    let maxMarkers = 0;
    for (; game.week < weekLimit && game.outcome === 'playing'; ) {
        const world = metrics(game);
        const threshold =
            (family === 'burst' ? 0.2 : family === 'expansion_burst' ? 0.45 : 0.35) + offset;
        if (world.adoption >= threshold || (world.adoption > 0.2 && game.controlProgress > 0.4))
            delegation = true;
        if (game.week % interval === 0) {
            const skill = nextSkill(game, family, delegation);
            const baseReserve = actions === 'opportunist' ? 0 : actions === 'cautious' ? 4 : 2;
            const reserve =
                options.protectSkillBudget && skill
                    ? Math.max(baseReserve, skill.cost)
                    : baseReserve;
            const paidEvents =
                options.paidEvents !== false &&
                (options.paidEventsAfterWeek === undefined ||
                    game.week >= options.paidEventsAfterWeek);
            for (const [action, enabled] of [
                [useOpportunity, paidEvents],
                [respond, options.responses],
            ] as const) {
                const result = action(game, enabled === false ? 'invest' : actions, reserve);
                game = result.game;
                if (result.decision) decisions.push(result.decision);
            }
            if (skill && !skillBlockReason(game, skill)) {
                game = learnSkill(game, skill.id);
                decisions.push({ week: game.week, kind: 'skill', id: skill.id, sp: skill.cost });
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
        maxMarkers = Math.max(
            maxMarkers,
            game.researchProjects.filter((item) => item.status === 'active').length,
        );
        if (
            game.skillPoints < 0 ||
            game.encounters.filter((item) => item.status === 'pending').length > 2 ||
            maxMarkers > 3 ||
            game.areas.some(
                (area) =>
                    !Number.isFinite(area.dependent) ||
                    Math.min(area.autonomous, area.dependent, area.antiAI) < -1e-9 ||
                    area.autonomous + area.dependent + area.antiAI > 1 + 1e-9,
            )
        )
            throw new Error('人口・SP・案件数のシミュレーションが成立していません');
    }
    return { game, decisions, history, maxMarkers };
}
