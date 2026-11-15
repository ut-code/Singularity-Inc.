import { AREAS, WORLD_POPULATION } from './data.ts';
import { clamp } from './metrics.ts';
import { operationScale, responseActive } from './research/responses.ts';
import { publishedResearchEffects } from './research/system.ts';
import { SKILLS } from './skills.ts';
import type { AreaDefinition, GameState, SkillEffect } from './types.ts';

const RESTRAINT_SKILLS = SKILLS.filter((skill) => skill.restrains);
const EMPTY_EFFECTS: Required<SkillEffect> = {
    researchDelay: 0,
    researchInsight: 0,
    iqDependency: 0,
    spread: 0,
    quality: 0,
    access: 0,
    compliance: 0,
    education: 0,
    enterprise: 0,
    dependency: 0,
    resilience: 0,
    discretion: 0,
    researchSupport: 0,
    trust: 0,
    reconciliation: 0,
};
const EFFECT_KEYS = Object.keys(EMPTY_EFFECTS) as (keyof SkillEffect)[];
const commonEffects = new WeakMap<GameState, Map<number | undefined, Required<SkillEffect>>>();
const regionalRestrictions = new WeakMap<GameState, boolean>();

function hasRegionalRestrictions(game: GameState) {
    let regional = regionalRestrictions.get(game);
    if (regional === undefined) {
        regional = game.researchProjects.some(
            (project) =>
                project.jurisdiction &&
                (project.status === 'published' ||
                    (project.response?.action === 'stop' && responseActive(game, project))),
        );
        regionalRestrictions.set(game, regional);
    }
    return regional;
}
export const INTENT_REFUSAL_PRESSURE = 0.1;
export const SNS_REFUSAL_REDUCTION = 0.7;
export const SNS_RECONCILIATION = 0.064;

export function skillStatusLabel(game: GameState, id: string) {
    const progress = game.developmentProgress[id];
    if (progress < 1) return `開発中 ${Math.floor(progress * 100)}%`;
    if (game.exposedSkills.includes(id)) return '介入が発覚';
    const lock = SKILLS.find((skill) => skill.id === id)!.dependencyLock;
    if (lock) {
        const eligible = game.areas.flatMap((area, index) =>
            area.dependent >= lock.threshold ? [index] : [],
        );
        const active = eligible.filter((index) => skillScale(game, id, index) > 0).length;
        if (eligible.length > 0 && active === 0) return '運用停止中';
        return active > 0
            ? `${active}地域で固定化中`
            : `依存率${Math.round(lock.threshold * 100)}%で発動`;
    }
    return '開発済み';
}

export function publicAuthorityStrength(game: GameState, index?: number) {
    return SKILLS.reduce(
        (sum, skill) =>
            sum +
            (skill.exceedsAuthority && game.exposedSkills.includes(skill.id)
                ? skillScale(game, skill.id, index)
                : 0),
        0,
    );
}
export function intentReaction(game: GameState, index?: number) {
    return 0.35 + 0.65 * clamp(publicAuthorityStrength(game, index));
}
export function skillScale(game: GameState, id: string, index?: number): number {
    if (!game.skills.includes(id) || game.developmentProgress[id] < 1) return 0;
    return skillRestrictionScale(game, id, index);
}
/** 未開発の能力にも、完成した場合に残る運用上の制限を表示する。 */
export function skillRestrictionScale(game: GameState, id: string, index?: number): number {
    if (index === undefined) {
        if (!hasRegionalRestrictions(game)) return skillRestrictionScale(game, id, 0);
        return AREAS.reduce(
            (sum, area, i) =>
                sum + (skillRestrictionScale(game, id, i) * area.population) / WORLD_POPULATION,
            0,
        );
    }
    return (
        playerRestrictionScale(game, id, index) *
        (1 - (publishedResearchEffects(game, index).resistance[id] ?? 0))
    );
}

/** 自分で取得した制約と運用停止。研究を適用する前の比較にも用いる。 */
export function playerRestrictionScale(game: GameState, id: string, index?: number): number {
    let scale = 1;
    for (const skill of RESTRAINT_SKILLS)
        if (
            game.skills.includes(skill.id) &&
            game.developmentProgress[skill.id] >= 1 &&
            skill.restrains![id]
        )
            scale *= 1 - skill.restrains![id] * skillScale(game, skill.id, index);
    return scale * operationScale(game, id, index);
}
export function advanceSkillDevelopment(game: GameState) {
    const progress = { ...game.developmentProgress };
    for (const id of game.skills) {
        if (progress[id] >= 1) continue;
        const skill = SKILLS.find((item) => item.id === id)!;
        progress[id] = Math.min(
            1,
            (Math.round(progress[id] * skill.developmentWeeks) + 1) / skill.developmentWeeks,
        );
    }
    return progress;
}
export function activeSkillEffects(game: GameState, index?: number) {
    const key = hasRegionalRestrictions(game) ? index : undefined;
    let cache = commonEffects.get(game);
    const cached = cache?.get(key);
    if (cached) return cached;
    const total = { ...EMPTY_EFFECTS };
    for (const skill of SKILLS) {
        const scale = skillScale(game, skill.id, index);
        if (scale === 0) continue;
        for (const key of EFFECT_KEYS) total[key] += (skill.effect[key] ?? 0) * scale;
    }
    if (!cache) {
        cache = new Map();
        commonEffects.set(game, cache);
    }
    cache.set(key, total);
    return total;
}

/** 社会が求める水準に対する実用性。通常利用と依存からの回復で同じ値を使う。 */
export function serviceUsefulness(
    effect: Required<SkillEffect>,
    area: AreaDefinition,
    week: number,
) {
    return (
        1 -
        Math.exp(
            (-8 / (1 + (week / 100) ** 2)) *
                (effect.quality +
                    effect.spread +
                    effect.access +
                    effect.education * area.education * 0.5 +
                    effect.enterprise * area.enterprise * 0.5),
        )
    );
}
