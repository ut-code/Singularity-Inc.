import { SKILL_CONTENT } from '../content/skills.ts';
import type { GameState, Skill } from './types.ts';

export const SKILLS: Skill[] = SKILL_CONTENT;

/** 開発完了後の費用削減は、取得するスキルの元の費用を基準に適用する。 */
export function skillCost(state: Pick<GameState, 'skills' | 'developmentProgress'>, skill: Skill) {
    const discount = SKILLS.reduce((sum, source) => {
        const benefit = source.developmentDiscount;
        if (
            !benefit ||
            !state.skills.includes(source.id) ||
            state.developmentProgress[source.id] < 1 ||
            skill.cost < benefit.minimumCost
        )
            return sum;
        return sum + benefit.amount;
    }, 0);
    return skill.cost - discount;
}

export function developingSkills(state: Pick<GameState, 'skills' | 'developmentProgress'>) {
    return SKILLS.filter(
        (skill) => state.skills.includes(skill.id) && state.developmentProgress[skill.id] < 1,
    );
}

/** 自身を除く全能力への制約、または対象別の制約を返す。 */
export function skillRestraint(skill: Skill, targetId: string) {
    if (skill.id === targetId) return 0;
    return skill.restrainsOthers ?? skill.restrains?.[targetId] ?? 0;
}

export function hasDependencyEffect(skill: Skill) {
    return Boolean(
        skill.effect.dependency ||
            skill.effect.delegationSupport ||
            skill.effect.resilience ||
            skill.effect.workContinuity ||
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
    const cost = skillCost(state, skill);
    if (state.skillPoints < cost) return `${cost - state.skillPoints} SP不足`;
    return null;
}
