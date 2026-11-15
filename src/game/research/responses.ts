import { RESEARCH_TOPICS, type ResearchTopic } from '../../content/research.ts';
import { AREAS, WORLD_POPULATION } from '../data.ts';
import { clamp } from '../metrics.ts';
import { JURISDICTIONS, regionalMetrics, WORLD_AREAS } from '../regions.ts';
import { isGameActive } from '../session.ts';
import { skillScale } from '../skillRuntime.ts';
import { SKILLS } from '../skills.ts';
import type { GameState } from '../types.ts';
import type { ResearchAction, ResearchProject } from './types.ts';

export const RESPONSE_WEEKS = 12;
export const COOPERATION_IMPACT_REDUCTION = 0.5;
export const PRESSURE_TRUST_PENALTY = 0.15;
export const RESPONSE_COST = { cooperate: 1, pressure: 2, stop: 0 } as const;
export const RESPONSE_LABEL = {
    cooperate: '検証に協力',
    pressure: '周辺企業から圧力',
    stop: '対象機能を停止',
} as const;

export function responseAreas(project: ResearchProject) {
    return project.jurisdiction
        ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.areas
        : WORLD_AREAS;
}
export function responseSkills(game: GameState, project: ResearchProject) {
    const topic = RESEARCH_TOPICS.find((item) => item.id === project.researchId)!;
    return topic.targets.filter((id) => game.skills.includes(id));
}
export function responseActive(game: GameState, project: ResearchProject) {
    return (
        project.response !== undefined &&
        game.week < project.response.untilWeek &&
        (project.response.action === 'stop' || project.status === 'active')
    );
}
export function responseSafe(game: GameState, project: ResearchProject) {
    const topic = RESEARCH_TOPICS.find((item) => item.id === project.researchId)!;
    const targets = topic.targets.length ? topic.targets : game.skills;
    return !targets.some(
        (id) =>
            game.skills.includes(id) && SKILLS.find((skill) => skill.id === id)!.exceedsAuthority,
    );
}
/** 戦略的に不利な場合ではなく、作用の対象や利益が存在しない対応を除外する。 */
export function responseAvailable(
    game: GameState,
    project: ResearchProject,
    action: ResearchAction,
) {
    const topic = RESEARCH_TOPICS.find((item) => item.id === project.researchId)!;
    if (!topic.responses.includes(action)) return false;
    if (action === 'stop')
        return (
            topic.targets.length === 1 &&
            responseAreas(project).some((index) => skillScale(game, topic.targets[0], index) > 0)
        );
    if (action === 'cooperate') {
        if (!responseSafe(game, project)) return false;
        const impact = topic.onPublish;
        return responseAreas(project).some((index) => {
            const area = game.areas[index];
            return (
                ((impact.trust ?? 0) < 0 && area.favorability > 0) ||
                ((impact.refuse ?? 0) > 0 && area.autonomous > 0)
            );
        });
    }
    return true;
}

/** 協力による公表時の軽減は、12週の研究加速が終了しても維持する。 */
export function publicationEffect(topic: ResearchTopic, project: ResearchProject) {
    const effect = topic.onPublish;
    if (project.response?.action !== 'cooperate') return effect;
    return {
        ...effect,
        trust:
            effect.trust !== undefined && effect.trust < 0
                ? effect.trust * (1 - COOPERATION_IMPACT_REDUCTION)
                : effect.trust,
        refuse:
            effect.refuse !== undefined
                ? effect.refuse * (1 - COOPERATION_IMPACT_REDUCTION)
                : undefined,
    };
}
/** 圧力による不信は、公表・成立時に一度だけ発生する。 */
export function publicationTrustPenalty(project: ResearchProject) {
    return project.response?.action === 'pressure' ? PRESSURE_TRUST_PENALTY : 0;
}
export function responseBlockReason(
    game: GameState,
    project: ResearchProject,
    action: ResearchAction,
) {
    if (!isGameActive(game)) return 'ゲーム進行中のみ対応できます';
    if (project.status !== 'active') return '公表・成立済みです';
    if (project.response) return 'この案件には対応済みです';
    if (!responseAvailable(game, project, action))
        return 'この案件では効果のある対応ではありません';
    if (game.skillPoints < RESPONSE_COST[action])
        return `${RESPONSE_COST[action] - game.skillPoints} SP不足`;
    if (action === 'pressure' && regionalMetrics(game, responseAreas(project)).dependent < 0.15)
        return '対象地域の依存率15%以上が必要です';
    return null;
}
export function respondToResearch(game: GameState, id: string, action: ResearchAction): GameState {
    const project = game.researchProjects.find((item) => item.id === id);
    if (!project || responseBlockReason(game, project, action)) return game;
    const indices = responseAreas(project);
    const safe = responseSafe(game, project);
    return {
        ...game,
        skillPoints: game.skillPoints - RESPONSE_COST[action],
        areas: game.areas.map((area, index) =>
            indices.includes(index)
                ? {
                      ...area,
                      favorability: clamp(
                          area.favorability + (action === 'cooperate' && safe ? 0.03 : 0),
                      ),
                  }
                : area,
        ),
        researchProjects: game.researchProjects.map((item) =>
            item.id === id
                ? {
                      ...item,
                      response: {
                          action,
                          untilWeek: game.week + RESPONSE_WEEKS,
                          skillIds: responseSkills(game, project),
                      },
                  }
                : item,
        ),
    };
}
export function responseResearchMultiplier(game: GameState, project: ResearchProject) {
    if (!responseActive(game, project)) return 1;
    if (project.response!.action === 'cooperate') return 1.3;
    if (project.response!.action === 'stop') return 0.5;
    return 1 - regionalMetrics(game, responseAreas(project)).dependent * 0.6;
}
export function operationScale(game: GameState, id: string, index?: number) {
    const projects = game.researchProjects.filter(
        (project) =>
            project.response?.action === 'stop' &&
            responseActive(game, project) &&
            project.response.skillIds.includes(id),
    );
    if (projects.length === 0) return 1;
    const stopped = new Set(projects.flatMap(responseAreas));
    if (index !== undefined) return stopped.has(index) ? 0 : 1;
    return AREAS.reduce(
        (sum, area, i) => sum + (stopped.has(i) ? 0 : area.population / WORLD_POPULATION),
        0,
    );
}
export function responseRegionName(project: ResearchProject) {
    return project.jurisdiction
        ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.name
        : '世界全体';
}
