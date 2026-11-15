import type { GameState } from './types.ts';

/** 継続プレイでは最初の勝敗を保持したまま操作とシミュレーションを許可する。 */
export function isGameActive(game: GameState) {
    return game.started && (game.outcome === 'playing' || game.continued);
}
