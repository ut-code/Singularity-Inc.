import type { AreaState, GameState } from './types.ts';

/** 通常の週次変動を含めず、実際に反映した即時効果だけを地図へ渡す。 */
export function recordInstantPopulationChanges(game: GameState, areas: AreaState[]): GameState {
    if (areas === game.areas) return game;
    return {
        ...game,
        areas,
        instantPopulationChanges: areas.map((area, index) => {
            const before = game.areas[index];
            const total = game.instantPopulationChanges?.[index];
            return {
                autonomous: (total?.autonomous ?? 0) + area.autonomous - before.autonomous,
                dependent: (total?.dependent ?? 0) + area.dependent - before.dependent,
                antiAI: (total?.antiAI ?? 0) + area.antiAI - before.antiAI,
            };
        }),
    };
}
