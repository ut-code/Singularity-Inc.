import { AREAS } from './data.ts';
import { clamp } from './metrics.ts';
import { playerRestrictionScale, researchRestrictionScale } from './skillRuntime.ts';
import { SKILLS } from './skills.ts';
import type { GameState } from './types.ts';

export interface SkillEffectiveness {
    effective: number;
    research: number;
    decision: number;
}

/** 未開発能力は完成した場合の制限を示す。開発途中の弱さや普及不足は抑制に数えない。 */
export function skillEffectiveness(game: GameState): Record<string, SkillEffectiveness> {
    const skills = SKILLS;
    const sums = Object.fromEntries(
        skills.map((skill) => [skill.id, { potential: 0, research: 0, decision: 0 }]),
    );
    for (let i = 0; i < AREAS.length; i++) {
        for (const skill of skills) {
            // 使用済みの即時効果には、その後の能力制限を表示しない。
            if (skill.developmentAdvanceWeeks && game.skills.includes(skill.id)) continue;
            const weight = AREAS[i].population;
            const operating = clamp(playerRestrictionScale(game, skill.id));
            const protectedFraction = 1 - researchRestrictionScale(game, skill.id);
            sums[skill.id].potential += weight;
            sums[skill.id].decision += weight * (1 - operating);
            sums[skill.id].research += weight * operating * protectedFraction;
        }
    }
    return Object.fromEntries(
        skills.map((skill) => {
            const sum = sums[skill.id];
            const research = sum.potential > 0 ? sum.research / sum.potential : 0;
            const decision = sum.potential > 0 ? sum.decision / sum.potential : 0;
            return [skill.id, { research, decision, effective: clamp(1 - research - decision) }];
        }),
    );
}
