import { INSTITUTES } from '../../content/institutes.ts';
import {
    RESEARCH_TOPICS,
    type ResearchEffects,
    type ResearchTopic,
} from '../../content/research.ts';
import { canPlaceMapIncident } from '../mapIncidents.ts';
import { clamp } from '../metrics.ts';
import { seededValue } from '../random.ts';
import { recoveryMultiplier } from '../recovery.ts';
import { JURISDICTIONS, regionalMetrics, WORLD_AREAS } from '../regions.ts';
import { isGameActive } from '../session.ts';
import { activeSkillEffects, INTENT_REFUSAL_PRESSURE, skillScale } from '../skillRuntime.ts';
import { SKILLS } from '../skills.ts';
import type { GameState } from '../types.ts';
import { instituteArea } from './locations.ts';
import { responseAreas, responseResearchMultiplier } from './responses.ts';
import { researchEffectGroups } from './text.ts';
import type { ResearchProject } from './types.ts';

export { RESEARCH_TOPICS } from '../../content/research.ts';

const START_INTERVAL = 12;
const MAX_ACTIVE_RESEARCH = 3;

export function researchTopic(project: ResearchProject) {
    return RESEARCH_TOPICS.find((topic) => topic.id === project.researchId)!;
}
export function researchApplies(project: ResearchProject, index: number) {
    return (
        !project.jurisdiction ||
        JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.areas.includes(index)
    );
}
export function publishedResearchEffects(game: GameState, index: number): ResearchEffects {
    const result: ResearchEffects = {
        resistance: {},
        pressure: 0,
        recovery: 0,
        alternatives: 0,
        intent: 0,
        adoptionPenalty: 0,
    };
    for (const project of game.researchProjects) {
        if (project.status !== 'published' || !researchApplies(project, index)) continue;
        const topic = researchTopic(project);
        for (const skill of topic.targets)
            result.resistance[skill] =
                1 - (1 - (result.resistance[skill] ?? 0)) * (1 - topic.suppression);
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
    return result;
}
export function publishedResearchPressure(game: GameState, index: number) {
    const effects = publishedResearchEffects(game, index);
    return effects.pressure + effects.intent * INTENT_REFUSAL_PRESSURE;
}
export function researchEfficiency(game: GameState, project: ResearchProject) {
    const world = regionalMetrics(game, responseAreas(project));
    const support = activeSkillEffects(game).researchSupport;
    return (
        (1 + world.adoption * 0.5) *
        (1 - world.dependent * 0.75) *
        (1 + support * 0.2) *
        responseResearchMultiplier(game, project)
    );
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
    const insight =
        topic.category === 'research' ? Math.round(activeSkillEffects(game).researchInsight) : 0;
    const indices = responseAreas(project);
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
                      result: `${topic.name}${topic.category === 'regulation' ? 'が成立' : 'を公表'}`,
                  }
                : item,
        ),
    };
    const areas = game.areas.map((area, index) => {
        if (!indices.includes(index)) return area;
        const recovered =
            area.dependent *
            (effect.recover ?? 0) *
            recoveryMultiplier(
                published,
                index,
                publishedResearchEffects(published, index).resistance,
            );
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
                SKILLS.find((skill) => skill.id === id)!.exceedsAuthority
            )
                exposedSkills.add(id);
    return {
        ...published,
        skillPoints: game.skillPoints + insight,
        areas,
        exposedSkills: [...exposedSkills],
        news: [
            ...game.news,
            {
                id: `publication:${project.id}`,
                week: game.week,
                title: `${topic.name}${topic.category === 'regulation' ? 'が成立' : 'を公表'}`,
                summary: `${[
                    ...researchEffectGroups(topic).publication,
                    ...researchEffectGroups(topic).ongoing,
                ].join('。')}。${insight > 0 ? `反例解析で +${insight} SP。` : ''}`,
                region: project.jurisdiction
                    ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.name
                    : '全世界',
            },
        ],
    };
}

function eligible(game: GameState, topic: ResearchTopic, indices: number[]) {
    const world = regionalMetrics(game, indices);
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

/** 開始条件は普及・依存・対象スキル・先行研究だけ。知識値、共同研究、検証・施行工程は持たない。 */
export function advanceResearch(previous: GameState): GameState {
    if (!isGameActive(previous)) return previous;
    let game: GameState = {
        ...previous,
        researchProjects: previous.researchProjects.map((project) =>
            project.status === 'active'
                ? {
                      ...project,
                      progress: Math.min(100, project.progress + researchRate(previous, project)),
                  }
                : project,
        ),
    };
    for (const project of game.researchProjects)
        if (project.status === 'active' && project.progress >= 100) game = publish(game, project);
    if (
        game.week - game.lastResearchWeek < START_INTERVAL ||
        game.researchProjects.filter((project) => project.status === 'active').length >=
            MAX_ACTIVE_RESEARCH
    )
        return game;
    const candidates: { project: ResearchProject; score: number }[] = [];
    const availableInstitutes = INSTITUTES.filter((institute) =>
        canPlaceMapIncident(game, instituteArea(institute.id), institute),
    );
    for (const topic of RESEARCH_TOPICS) {
        const activeCategory = game.researchProjects.filter(
            (project) =>
                project.status === 'active' && researchTopic(project).category === topic.category,
        ).length;
        if (activeCategory >= (topic.category === 'research' ? 2 : 1)) continue;
        const jurisdictions = topic.category === 'regulation' ? JURISDICTIONS : [undefined];
        for (const jurisdiction of jurisdictions) {
            const id = jurisdiction ? `${topic.id}:${jurisdiction.id}` : topic.id;
            if (
                game.researchProjects.some((project) => project.id === id) ||
                !eligible(game, topic, jurisdiction?.areas ?? WORLD_AREAS)
            )
                continue;
            const locations = jurisdiction
                ? availableInstitutes.filter((institute) => institute.id === jurisdiction.institute)
                : availableInstitutes;
            if (locations.length === 0) continue;
            const institute =
                locations[Math.floor(seededValue(game.seed, topic.id) * locations.length)].id;
            candidates.push({
                project: {
                    id,
                    researchId: topic.id,
                    instituteId: institute,
                    jurisdiction: jurisdiction?.id,
                    progress: 0,
                    startedWeek: game.week,
                    status: 'active',
                },
                score: topic.priority * (0.8 + seededValue(game.seed, id) * 0.4),
            });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return game;
    return {
        ...game,
        lastResearchWeek: game.week,
        researchProjects: [...game.researchProjects, candidates[0].project],
    };
}
