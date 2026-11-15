import { skillScale } from './skillRuntime.ts';
import { SKILLS } from './skills.ts';
import type { GameState } from './types.ts';

/** 高依存地域の固定化は、回復・利用拒否への離脱・研究公表時の回復を同じ割合で抑える。 */
export function recoveryMultiplier(
    game: GameState,
    index: number,
    resistance: Record<string, number>,
) {
    return SKILLS.reduce((remaining, skill) => {
        const lock = skill.dependencyLock;
        if (!lock || game.areas[index].dependent < lock.threshold) return remaining;
        const strength = skillScale(game, skill.id, index) * (1 - (resistance[skill.id] ?? 0));
        return remaining * (1 - lock.recoveryReduction * strength);
    }, 1);
}
