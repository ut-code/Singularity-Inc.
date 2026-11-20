import { DIFFICULTY_SETTINGS } from './difficulty.ts';
import type { Difficulty } from './types.ts';

export const INITIAL_SKILL_POINTS = 2;
export const MILESTONE_SP = 1;
export const ADOPTION_MILESTONES = [0.1, 0.25, 0.5, 0.75, 0.9];
export const DEPENDENCY_MILESTONES = [0.25, 0.5, 0.75, 0.9];

export function regularSkillPoints(week: number, difficulty: Difficulty) {
    return Math.floor(week / DIFFICULTY_SETTINGS[difficulty].regularSPIntervalWeeks);
}

/** 基礎支給と成果報酬を独立に積み上げ、人口減少で基礎支給が相殺されないようにする。 */
export function earnedSkillPoints(
    week: number,
    peakAdoption: number,
    peakDependency: number,
    difficulty: Difficulty,
) {
    return (
        regularSkillPoints(week, difficulty) +
        ADOPTION_MILESTONES.filter((value) => peakAdoption >= value).length * MILESTONE_SP +
        DEPENDENCY_MILESTONES.filter((value) => peakDependency >= value).length * MILESTONE_SP
    );
}

export function spSupplyLabel(week: number, difficulty: Difficulty) {
    const interval = DIFFICULTY_SETTINGS[difficulty].regularSPIntervalWeeks;
    const weeks = interval - (week % interval);
    return `次の定期支給まで ${weeks}週 · +1 SP`;
}
