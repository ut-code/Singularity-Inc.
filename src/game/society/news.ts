import type { GameState } from '../types.ts';

/** 実際に起きた公表・地域での選択だけを記録する。 */
export function worldNews(game: GameState) {
    return [...game.news].sort((a, b) => b.week - a.week || a.id.localeCompare(b.id));
}

export interface NewsRecord {
    id: string;
    week: number;
    title: string;
    summary: string;
    region: string;
}
