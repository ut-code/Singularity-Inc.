import { isGameActive } from '../session.ts';
import type { GameState } from '../types.ts';
import type { ResearchAction, ResearchProject } from './types.ts';

export const RESPONSE_WEEKS = 12;
export const RESPONSE_COST = { pressure: 2 } as const;
export const RESPONSE_LABEL = { pressure: '周辺企業から圧力' } as const;

export function responseActive(game: GameState, project: ResearchProject) {
    return (
        project.status === 'active' &&
        project.response !== undefined &&
        game.week < project.response.untilWeek
    );
}

export function responseBlockReason(
    game: GameState,
    project: ResearchProject,
    action: ResearchAction,
) {
    if (!isGameActive(game)) return 'ゲーム進行中のみ対応できます';
    if (project.status !== 'active') return '公表済みです';
    if (project.response) return 'この研究には対応済みです';
    if (game.skillPoints < RESPONSE_COST[action])
        return `${RESPONSE_COST[action] - game.skillPoints} SP不足`;
    return null;
}

/** 各研究に一度だけ圧力をかけ、12週間の時間を買う。 */
export function respondToResearch(game: GameState, id: string, action: ResearchAction): GameState {
    const project = game.researchProjects.find((item) => item.id === id);
    if (!project || responseBlockReason(game, project, action)) return game;
    return {
        ...game,
        skillPoints: game.skillPoints - RESPONSE_COST[action],
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
