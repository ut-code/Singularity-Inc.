import { WEEK_MS } from './data.ts';
import { DIFFICULTY_SETTINGS } from './difficulty.ts';
import { metrics } from './metrics.ts';
import type { GameState } from './types.ts';

const CONTROL_START_WEEK = Math.ceil(60_000 / WEEK_MS);
const CONTROL_START_ADOPTION = 0.1;

export function controlEfficiency(game: GameState) {
    const world = metrics(game);
    return (0.8 + world.adoption * 0.2) * (1 - world.dependent * 0.9);
}

/** 普及か時間経過で研究が始まる。普及で速まり、依存で遅くなるが、知見は失わない。 */
export function controlRate(game: GameState) {
    const world = metrics(game);
    if (!game.started) return 0;
    if (
        !game.controlStarted &&
        game.week < CONTROL_START_WEEK &&
        world.adoption < CONTROL_START_ADOPTION
    )
        return 0;
    return controlEfficiency(game) / DIFFICULTY_SETTINGS[game.difficulty].controlWork;
}

export function advanceControl(game: GameState): GameState {
    const rate = controlRate(game);
    if (rate === 0) return game;
    return {
        ...game,
        controlStarted: true,
        controlProgress: Math.min(1, game.controlProgress + rate),
    };
}

export const CONTROL_CAUTION = 0.75;
export const CONTROL_ALERT = 0.9;
