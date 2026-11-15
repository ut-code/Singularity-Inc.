import { skillScale } from './skillRuntime.ts';
import { SKILLS } from './skills.ts';
import type { GameState } from './types.ts';

/** 社会基盤への依存が成立した地域では、利用拒否者も直接依存へ移る。 */
export function infrastructureDependency(game: GameState, index: number) {
    const area = game.areas[index];
    return SKILLS.reduce((converted, skill) => {
        const lock = skill.dependencyLock;
        if (!lock || area.dependent < lock.threshold) return converted;
        return converted + area.antiAI * lock.refusalConversion * skillScale(game, skill.id, index);
    }, 0);
}

/** 高依存地域の固定化は、回復・利用拒否への離脱・研究公表時の回復を同じ割合で抑える。 */
export function recoveryMultiplier(game: GameState, index: number) {
    return SKILLS.reduce((remaining, skill) => {
        const lock = skill.dependencyLock;
        if (!lock || game.areas[index].dependent < lock.threshold) return remaining;
        const strength = skillScale(game, skill.id, index);
        return remaining * (1 - lock.recoveryReduction * strength);
    }, 1);
}
