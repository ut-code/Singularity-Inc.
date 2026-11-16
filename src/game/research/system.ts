import { INSTITUTES } from '../../content/institutes.ts';
import {
    RESEARCH_TOPICS,
    type ResearchEffects,
    type ResearchTopic,
} from '../../content/research.ts';
import { recordInstantPopulationChanges } from '../instantPopulationChanges.ts';
import { canPlaceMapIncident } from '../mapIncidents.ts';
import { clamp, metrics } from '../metrics.ts';
import { seededValue } from '../random.ts';
import { recoveryMultiplier } from '../recovery.ts';
import { isGameActive } from '../session.ts';
import { activeSkillEffects, INTENT_REFUSAL_PRESSURE, skillScale } from '../skillRuntime.ts';
import { SKILLS } from '../skills.ts';
import type { GameState } from '../types.ts';
import { instituteArea } from './locations.ts';
import { responseActive } from './responses.ts';
import { researchEffectGroups } from './text.ts';
import type { ResearchProject } from './types.ts';

export { RESEARCH_TOPICS } from '../../content/research.ts';

const START_INTERVAL = 12;
const effectCache = new WeakMap<GameState, ResearchEffects>();

export function researchTopic(project: ResearchProject) {
    return RESEARCH_TOPICS.find((topic) => topic.id === project.researchId)!;
}
export function publishedResearchEffects(game: GameState): ResearchEffects {
    const cached = effectCache.get(game);
    if (cached) return cached;
    const result: ResearchEffects = {
        resistance: {},
        pressure: 0,
        recovery: 0,
        alternatives: 0,
        intent: 0,
        adoptionPenalty: 0,
    };
    for (const project of game.researchProjects) {
        if (project.status !== 'published') continue;
        const topic = researchTopic(project);
        const resistance = result.resistance;
        for (const skill of topic.targets)
            resistance[skill] = 1 - (1 - (resistance[skill] ?? 0)) * (1 - topic.suppression);
        for (const key of [
            'pressure',
            'recovery',
            'alternatives',
            'intent',
            'adoptionPenalty',
        ] as const)
            result[key] += topic.ongoing[key] ?? 0;
    }
    result.adoptionPenalty = Math.min(0.8, result.adoptionPenalty);
    effectCache.set(game, result);
    return result;
}

export function publishedResearchPressure(game: GameState) {
    const effects = publishedResearchEffects(game);
    return effects.pressure + effects.intent * INTENT_REFUSAL_PRESSURE;
}
export function researchEfficiency(game: GameState, project: ResearchProject) {
    if (responseActive(game, project)) return 0;
    const world = metrics(game);
    const support = activeSkillEffects(game).researchSupport;
    return (1 + world.adoption * 0.5) * (1 - world.dependent * 0.75) * (1 + support * 0.2);
}
export function researchRate(game: GameState, project: ResearchProject) {
    if (project.status !== 'active') return 0;
    return (
        (researchEfficiency(game, project) * 100) /
        (researchTopic(project).work *
            (0.85 + seededValue(game.seed, `${project.researchId}:work`) * 0.3))
    );
}

function publish(game: GameState, project: ResearchProject): GameState {
    const topic = researchTopic(project);
    const effect = topic.onPublish;
    const insight = Math.round(activeSkillEffects(game).researchInsight);
    // 新たな対策による能力抑制を、公表時の回復にも先に織り込む。
    const published: GameState = {
        ...game,
        researchProjects: game.researchProjects.map((item) =>
            item.id === project.id
                ? {
                      ...item,
                      progress: 100,
                      status: 'published',
                      publishedWeek: game.week,
                      result: `${topic.name}を公表`,
                  }
                : item,
        ),
    };
    const areas = game.areas.map((area, index) => {
        const recovered =
            area.dependent * (effect.recover ?? 0) * recoveryMultiplier(published, index);
        const autonomous = area.autonomous + recovered;
        const rejected = autonomous * (effect.refuse ?? 0);
        const reconciled = area.antiAI * (effect.reconcile ?? 0);
        const trust = effect.trust ?? 0;
        return {
            ...area,
            autonomous: autonomous - rejected + reconciled,
            dependent: area.dependent - recovered,
            antiAI: area.antiAI + rejected - reconciled,
            favorability: clamp(
                trust < 0 ? area.favorability * (1 + trust) : area.favorability + trust,
            ),
        };
    });
    const exposedSkills = new Set(game.exposedSkills);
    if (effect.reveal)
        for (const id of topic.targets)
            if (
                game.skills.includes(id) &&
                game.developmentProgress[id] >= 1 &&
                SKILLS.find((skill) => skill.id === id)!.exceedsAuthority
            )
                exposedSkills.add(id);
    return {
        ...recordInstantPopulationChanges(published, areas),
        skillPoints: game.skillPoints + insight,
        areas,
        exposedSkills: [...exposedSkills],
        news: [
            ...game.news,
            {
                id: `publication:${project.id}`,
                week: game.week,
                title: `${topic.name}を公表`,
                summary: `${[
                    ...researchEffectGroups(topic).publication,
                    ...researchEffectGroups(topic).ongoing,
                ].join('。')}。${insight > 0 ? `反例解析で +${insight} SP。` : ''}`,
                region: '全世界',
            },
        ],
    };
}

function eligible(game: GameState, topic: ResearchTopic) {
    const world = metrics(game);
    return (
        world.adoption >= topic.minAdoption &&
        world.dependent >= (topic.minDependency ?? 0) &&
        (!topic.anySkills || topic.anySkills.some((id) => skillScale(game, id) >= 0.3)) &&
        (!topic.requires ||
            topic.requires.every((id) =>
                game.researchProjects.some(
                    (project) => project.researchId === id && project.status === 'published',
                ),
            ))
    );
}

/** 条件を初めて満たした週に待機期限を決め、配置が空く前から待機時間を数える。 */
function prepareResearch(game: GameState): GameState {
    const researchReadyWeeks = { ...game.researchReadyWeeks };
    const delay = Math.round(activeSkillEffects(game).researchDelay);
    for (const topic of RESEARCH_TOPICS) {
        if (
            researchReadyWeeks[topic.id] !== undefined ||
            game.researchProjects.some((project) => project.researchId === topic.id) ||
            !eligible(game, topic)
        )
            continue;
        const wait = Math.floor(
            seededValue(game.seed, `research-delay:${topic.id}`) * (2 * delay + 1),
        );
        researchReadyWeeks[topic.id] = game.week + wait;
    }
    return { ...game, researchReadyWeeks };
}

/** 普及・依存・対象スキル・先行研究の条件と、能力秘匿による待機期限を確認する。 */
export function advanceResearch(previous: GameState): GameState {
    if (!isGameActive(previous)) return previous;
    let game: GameState = {
        ...previous,
        researchProjects: previous.researchProjects.map((project) =>
            project.status === 'active' &&
            // 週次処理には更新後の週が渡るため、停止期限の週末までは進めない。
            !(project.response && previous.week <= project.response.untilWeek)
                ? {
                      ...project,
                      progress: Math.min(100, project.progress + researchRate(previous, project)),
                  }
                : project,
        ),
    };
    for (const project of game.researchProjects)
        if (project.status === 'active' && project.progress >= 100) game = publish(game, project);
    game = prepareResearch(game);
    if (game.week - game.lastResearchWeek < START_INTERVAL) return game;
    const candidates: { project: ResearchProject; score: number }[] = [];
    const availableInstitutes = INSTITUTES.filter((institute) =>
        canPlaceMapIncident(game, instituteArea(institute.id), institute),
    );
    for (const topic of RESEARCH_TOPICS) {
        if (
            game.researchProjects.some((project) => project.id === topic.id) ||
            !eligible(game, topic) ||
            game.week < game.researchReadyWeeks[topic.id] ||
            availableInstitutes.length === 0
        )
            continue;
        const institute =
            availableInstitutes[
                Math.floor(seededValue(game.seed, topic.id) * availableInstitutes.length)
            ].id;
        candidates.push({
            project: {
                id: topic.id,
                researchId: topic.id,
                instituteId: institute,
                progress: 0,
                startedWeek: game.week,
                status: 'active',
            },
            score: topic.priority * (0.8 + seededValue(game.seed, topic.id) * 0.4),
        });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return game;
    return {
        ...game,
        lastResearchWeek: game.week,
        researchProjects: [...game.researchProjects, candidates[0].project],
    };
}
