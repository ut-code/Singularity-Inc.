import { AREAS } from './data.ts';
import { clamp } from './metrics.ts';
import { playerRestrictionScale, skillScale } from './skillRuntime.ts';
import { SKILLS } from './skills.ts';
import type { GameState, Skill, SkillDomain } from './types.ts';

export const DEPENDENCY_DOMAINS: Record<string, SkillDomain> = Object.fromEntries(
    SKILLS.filter((skill) => skill.domain).map((skill) => [skill.id, skill.domain!]),
);

/** 習得だけでは依存化しない。利用者と現地の用途が揃うほど運用が実を結ぶ。 */
export function skillReadiness(game: GameState, index: number, skill: Skill) {
    const area = game.areas[index];
    const definition = AREAS[index];
    const use = area.autonomous + area.dependent;
    switch (DEPENDENCY_DOMAINS[skill.id]) {
        case 'work':
            return clamp((use - 0.08) / 0.5) * (0.35 + definition.enterprise * 0.9);
        case 'personal':
            return clamp((use - 0.12) / 0.45) * (0.8 + (1 - definition.enterprise) * 0.35);
        case 'learning':
            return clamp((use - 0.08) / 0.45) * (0.3 + definition.education * 1.1);
    }
    return 0;
}

export function deployedDependency(game: GameState, index: number, ignoreResearch = false) {
    const deployed = { work: 0, personal: 0, learning: 0, consensual: 0 };
    const iqCount = SKILLS.filter(
        (skill) =>
            skill.branch === 'IQ' &&
            game.skills.includes(skill.id) &&
            game.developmentProgress[skill.id] >= 1,
    ).length;
    for (const skill of SKILLS) {
        const effect = skill.effect;
        if (!game.skills.includes(skill.id) || game.developmentProgress[skill.id] < 1) continue;
        const dependency = (effect.dependency ?? 0) + (effect.iqDependency ?? 0) * iqCount;
        if (dependency === 0) continue;
        const strength =
            dependency *
            (ignoreResearch
                ? playerRestrictionScale(game, skill.id, index)
                : skillScale(game, skill.id, index)) *
            skillReadiness(game, index, skill);
        deployed[DEPENDENCY_DOMAINS[skill.id]] += strength;
        if (!skill.exceedsAuthority) deployed.consensual += strength;
    }
    return deployed;
}
