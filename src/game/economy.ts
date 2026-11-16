import { WEEK_MS } from './data.ts';

export const INITIAL_SKILL_POINTS = 2;
export const REGULAR_SP_INTERVAL_WEEKS = 10;
export const REGULAR_SP_INTERVAL_MS = REGULAR_SP_INTERVAL_WEEKS * WEEK_MS;
export const MILESTONE_SP = 1;
export const ADOPTION_MILESTONES = [0.1, 0.25, 0.5, 0.75, 0.9];
export const DEPENDENCY_MILESTONES = [0.25, 0.5, 0.75, 0.9];

/** 基礎支給と成果報酬を独立に積み上げ、人口減少で基礎支給が相殺されないようにする。 */
export function earnedSkillPoints(week: number, peakAdoption: number, peakDependency: number) {
    return (
        Math.floor(week / REGULAR_SP_INTERVAL_WEEKS) +
        ADOPTION_MILESTONES.filter((value) => peakAdoption >= value).length * MILESTONE_SP +
        DEPENDENCY_MILESTONES.filter((value) => peakDependency >= value).length * MILESTONE_SP
    );
}

export function spSupplyLabel(week: number) {
    const weeks = REGULAR_SP_INTERVAL_WEEKS - (week % REGULAR_SP_INTERVAL_WEEKS);
    return `次の定期支給まで ${weeks}週 · +1 SP`;
}
