import { AREAS } from '../data.ts';
import { deployedDependency } from '../skillDynamics.ts';
import type { GameState } from '../types.ts';

/** 地図の斜線とスキル表示が、同じ対策の効き目を参照する。 */
export function researchProtection(game: GameState) {
    return AREAS.map((_, area) => {
        const before = deployedDependency(game, area, true);
        const after = deployedDependency(game, area);
        const potential = before.work + before.personal + before.learning;
        return potential > 0 ? 1 - (after.work + after.personal + after.learning) / potential : 0;
    });
}
