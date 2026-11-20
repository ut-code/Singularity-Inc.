import { deployedDependency } from './skillDynamics.ts';
import { activeSkillEffects, skillScale } from './skillRuntime.ts';
import { SKILLS } from './skills.ts';
import type { GameState } from './types.ts';

/** 社会基盤への依存が成立した地域では、利用拒否者も直接依存へ移る。 */
export function infrastructureDependency(game: GameState, index: number) {
    const area = game.areas[index];
    return SKILLS.reduce((converted, skill) => {
        const lock = skill.dependencyLock;
        if (!lock || area.dependent < lock.threshold) return converted;
        return converted + area.antiAI * lock.refusalConversion * skillScale(game, skill.id);
    }, 0);
}

/** 業務の継続と高依存地域の固定化で、通常の回復と研究公表時の離脱を抑える。 */
export function recoveryMultiplier(game: GameState, index: number) {
    const deployed = deployedDependency(game, index);
    const total = deployed.work + deployed.personal + deployed.judgment;
    // 稼働中の委任に占める業務の割合だけに適用し、心理的な依存には広げない。
    const workShare = total > 0 ? deployed.work / total : 0;
    const continuity = activeSkillEffects(game).workContinuity * workShare;
    return SKILLS.reduce(
        (remaining, skill) => {
            const lock = skill.dependencyLock;
            if (!lock || game.areas[index].dependent < lock.threshold) return remaining;
            const strength = skillScale(game, skill.id);
            return remaining * (1 - lock.recoveryReduction * strength);
        },
        1 / (1 + continuity),
    );
}
