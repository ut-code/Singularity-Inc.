import { isGameActive } from '../session.ts';
import type { GameState } from '../types.ts';
import type { ResearchAction, ResearchProject } from './types.ts';

export const RESPONSE_WEEKS = 12;
export const RESPONSE_LABEL = { pressure: '周辺企業から圧力' } as const;

export function responseCost(project: ResearchProject) {
    switch (project.researchId) {
        case 'dependence-study':
        case 'decision-tracing':
            return 1;
        case 'intent-decoding':
            return 3;
        default:
            return 2;
    }
}

export function responseActive(game: GameState, project: ResearchProject) {
    return (
        project.status === 'active' &&
        project.response !== undefined &&
        game.week < project.response.untilWeek
    );
}

export function responseBlockReason(game: GameState, project: ResearchProject) {
    if (!isGameActive(game)) return 'ゲーム進行中のみ対応できます';
    if (project.status !== 'active') return '公表済みです';
    if (project.response) return 'この研究には対応済みです';
    const cost = responseCost(project);
    if (game.skillPoints < cost) return `${cost - game.skillPoints} SP不足`;
    return null;
}

/** 各研究に一度だけ圧力をかけ、12週間の時間を買う。 */
export function respondToResearch(game: GameState, id: string, action: ResearchAction): GameState {
    const project = game.researchProjects.find((item) => item.id === id);
    if (!project || responseBlockReason(game, project)) return game;
    return {
        ...game,
        skillPoints: game.skillPoints - responseCost(project),
        researchProjects: game.researchProjects.map((item) =>
            item.id === id
                ? {
                      ...item,
                      response: { action, untilWeek: game.week + RESPONSE_WEEKS },
                  }
                : item,
        ),
    };
}
