import { correctGlobalMetricDeltas } from '../map/metricChanges.ts';
import type { AreaState, GameState } from './types.ts';

/** 通常の週次変動を含めず、実際に反映した即時効果だけを地図へ渡す。 */
export function recordInstantPopulationChanges(
    game: GameState,
    areas: AreaState[],
    scope: 'regional' | 'global' = 'regional',
): GameState {
    if (areas === game.areas) return game;
    const deltas = areas.map((area, index) => {
        const before = game.areas[index];
        return {
            adoption: area.autonomous + area.dependent - before.autonomous - before.dependent,
            dependent: area.dependent - before.dependent,
            antiAI: area.antiAI - before.antiAI,
            favorability: 0,
        };
    });
    const markers = scope === 'global' ? correctGlobalMetricDeltas(deltas) : deltas;
    return {
        ...game,
        areas,
        instantPopulationChanges: markers.map((delta, index) => {
            const total = game.instantPopulationChanges?.[index];
            return {
                autonomous: (total?.autonomous ?? 0) + delta.adoption - delta.dependent,
                dependent: (total?.dependent ?? 0) + delta.dependent,
                antiAI: (total?.antiAI ?? 0) + delta.antiAI,
            };
        }),
    };
}
