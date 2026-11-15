import { SKILL_CONTENT } from '../content/skills.ts';
import type { GameState, Skill } from './types.ts';

export const SKILLS: Skill[] = SKILL_CONTENT;

export function hasDependencyEffect(skill: Skill) {
    return Boolean(
        skill.effect.dependency ||
            skill.effect.iqDependency ||
            skill.effect.resilience ||
            skill.dependencyLock,
    );
}

/** 基礎技術、または前提技術の開発完了で解放する。 */
export function skillReachable(
    state: Pick<GameState, 'skills' | 'developmentProgress'>,
    skill: Skill,
): boolean {
    return (
        skill.requires.length === 0 ||
        skill.requires.some((id) => state.skills.includes(id) && state.developmentProgress[id] >= 1)
    );
}

export function skillBlockReason(
    state: Pick<GameState, 'skills' | 'skillPoints' | 'developmentProgress'>,
    skill: Skill,
): string | null {
    if (state.skills.includes(skill.id))
        return state.developmentProgress[skill.id] < 1 ? '開発中' : '開発済み';
    if (!skillReachable(state, skill))
        return state.skills.includes(skill.requires[0])
            ? '前提スキルの完成待ち'
            : '前提スキルの開発が必要';
    const cost = skill.cost;
    if (state.skillPoints < cost) return `${cost - state.skillPoints} SP不足`;
    return null;
}
