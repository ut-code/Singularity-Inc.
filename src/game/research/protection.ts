import { AREAS } from '../data.ts';
import { deployedDependency } from '../skillDynamics.ts';
import type { GameState } from '../types.ts';
import { publishedResearchEffects } from './system.ts';

/** 地図の斜線とスキル表示が、同じ対策の効き目を参照する。 */
export function researchProtection(game: GameState) {
    return AREAS.map((_, area) => {
        const resistance = publishedResearchEffects(game, area).resistance;
        const before = deployedDependency(game, area);
        const after = deployedDependency(game, area, resistance);
        const potential = before.work + before.personal + before.learning;
        return potential > 0 ? 1 - (after.work + after.personal + after.learning) / potential : 0;
    });
}
