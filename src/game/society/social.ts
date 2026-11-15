import {
    INTERVENTION_AUTHORS,
    INTERVENTION_POSTS,
    RESEARCH_POSTS,
    SKILL_POSTS,
    SOCIAL_AUTHORS,
    type SocialTemplate,
    WORLD_POSTS,
} from '../../content/social.ts';
import { metrics, type WorldHistoryPoint } from '../metrics.ts';
import { seededValue } from '../random.ts';
import { JURISDICTIONS } from '../regions.ts';
import { skillScale } from '../skillRuntime.ts';
import { SKILLS } from '../skills.ts';
import type { GameState } from '../types.ts';

export interface SocialPost {
    id: string;
    sequence: number;
    templateId: string;
    week: number;
    author: { name: string; handle: string };
    text: string;
    intervention: boolean;
}
export interface SocialFeed {
    posts: SocialPost[];
    sequence: number;
    nextPostWeek: number;
}
export const emptySocialFeed = (): SocialFeed => ({ posts: [], sequence: 0, nextPostWeek: 0 });

function worldTemplates(game: GameState, history: WorldHistoryPoint[]) {
    const world = metrics(game);
    let baseline = history[0];
    for (let i = history.length - 1; i >= 0; i--)
        if (history[i].week <= game.week - 16) {
            baseline = history[i];
            break;
        }
    const adoptionChange = baseline ? world.adoption - baseline.adoption : 0;
    const dependencyChange = baseline ? world.dependent - baseline.dependent : 0;
    const refusalChange = baseline ? world.antiAI - baseline.antiAI : 0;
    const trustChange = baseline ? world.favorability - baseline.favorability : 0;
    if (world.adoption < 0.05 && world.antiAI < 0.05) return WORLD_POSTS.minor;
    const templates = [...WORLD_POSTS.everyday];
    if (adoptionChange >= 0.025 || (world.adoption >= 0.1 && world.adoption < 0.55))
        templates.push(...WORLD_POSTS.adoption);
    if (dependencyChange >= 0.02 || world.dependent >= 0.4)
        templates.push(...WORLD_POSTS.dependence);
    if (world.dependent >= 0.85 && world.favorability >= 0.75)
        templates.push(...WORLD_POSTS.devotion);
    if (world.dependent >= 0.85 && world.favorability <= 0.4)
        templates.push(...WORLD_POSTS.trapped);
    if (refusalChange >= 0.015 || world.antiAI >= 0.2) templates.push(...WORLD_POSTS.refusal);
    if (
        world.adoption >= 0.25 &&
        world.antiAI >= 0.25 &&
        Math.abs(world.adoption - world.antiAI) < 0.2
    )
        templates.push(...WORLD_POSTS.balance);
    if (trustChange >= 0.015 || world.favorability >= 0.75) templates.push(...WORLD_POSTS.trustUp);
    if (trustChange <= -0.02 || world.favorability <= 0.4) templates.push(...WORLD_POSTS.trustDown);
    return templates;
}

function addPost(
    feed: SocialFeed,
    game: GameState,
    templates: SocialTemplate[],
    {
        region = '',
        week = game.week,
        intervention = false,
    }: {
        region?: string;
        week?: number;
        intervention?: boolean;
    } = {},
): SocialFeed {
    const recent = new Set(feed.posts.slice(0, 4).map((post) => post.templateId));
    const candidates = templates.filter((template) => !recent.has(template.id));
    if (!candidates.length) return feed;
    const template =
        candidates[
            Math.floor(
                seededValue(game.seed + feed.sequence * 7919, 'social-text') * candidates.length,
            )
        ];
    const authors = (intervention ? INTERVENTION_AUTHORS : SOCIAL_AUTHORS)[template.voice];
    const author =
        authors[
            Math.floor(
                seededValue(game.seed + feed.sequence * 7919, `social-author:${template.id}`) *
                    authors.length,
            )
        ];
    const post: SocialPost = {
        id: `social:${feed.sequence}`,
        sequence: feed.sequence,
        templateId: template.id,
        week,
        author,
        intervention,
        text: template.text.replace(/\{(ai|region)\}/g, (_, token: string) =>
            token === 'ai' ? game.name : region,
        ),
    };
    return {
        ...feed,
        sequence: feed.sequence + 1,
        posts: [post, ...feed.posts].sort((a, b) => b.week - a.week).slice(0, 60),
    };
}

function interventionTemplates(game: GameState) {
    const world = metrics(game);
    const templates = [...INTERVENTION_POSTS.general];
    if (world.antiAI >= 0.1 || world.favorability < 0.5 || game.exposedSkills.length > 0)
        templates.push(...INTERVENTION_POSTS.criticism);
    if (world.dependent >= 0.4) templates.push(...INTERVENTION_POSTS.dependence);
    if (
        game.researchProjects.some(
            (project) => project.status === 'published' && project.jurisdiction,
        )
    )
        templates.push(...INTERVENTION_POSTS.regulation);
    return templates;
}

function addWorldPost(feed: SocialFeed, game: GameState, history: WorldHistoryPoint[]) {
    const strength = skillScale(game, 'sns-intervention');
    const intervention =
        strength > 0 &&
        seededValue(game.seed + feed.sequence * 7919, 'social-intervention') < 0.6 * strength;
    return addPost(
        feed,
        game,
        intervention ? interventionTemplates(game) : worldTemplates(game, history),
        { intervention },
    );
}

function skillTemplates(game: GameState, id: string) {
    // 公開されている使い心地の文面だけを定義し、秘匿能力の取得そのものは投稿しない。
    return game.skills.includes(id) && game.developmentProgress[id] >= 1 && skillScale(game, id) > 0
        ? SKILL_POSTS[id]
        : undefined;
}

/** 通常開始は最初の一件、デバッグ開始は現在の状況を読める短い履歴を用意する。 */
export function seedSocialFeed(game: GameState): SocialFeed {
    let feed = emptySocialFeed();
    if (game.week > 0) {
        for (const project of game.researchProjects
            .filter((item) => item.status === 'published')
            .slice(-2)) {
            const templates = RESEARCH_POSTS[project.researchId];
            if (!templates) continue;
            const region = project.jurisdiction
                ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.name
                : '';
            feed = addPost(feed, game, templates, { region, week: project.publishedWeek! });
        }
        const observable = SKILLS.filter((skill) => skillTemplates(game, skill.id));
        for (const skill of observable.slice(-2)) feed = addPost(feed, game, SKILL_POSTS[skill.id]);
        if (skillScale(game, 'sns-intervention') > 0)
            feed = addPost(feed, game, interventionTemplates(game), { intervention: true });
        for (let i = 0; i < 2; i++) feed = addWorldPost(feed, game, []);
    }
    feed = addWorldPost(feed, game, []);
    return { ...feed, nextPostWeek: game.week + 8 };
}

/** 投稿はゲーム状態を観測するだけで、人口・研究・SPには作用しない。 */
export function advanceSocialFeed(
    before: GameState,
    game: GameState,
    history: WorldHistoryPoint[],
    feed: SocialFeed,
): SocialFeed {
    if (!game.started) return feed;
    if (!before.started) return seedSocialFeed(game);
    if (
        before.week === game.week &&
        before.skills === game.skills &&
        before.researchProjects === game.researchProjects
    )
        return feed;
    let next = feed;
    for (const project of game.researchProjects) {
        if (
            project.status !== 'published' ||
            before.researchProjects.some(
                (old) => old.id === project.id && old.status === 'published',
            )
        )
            continue;
        const templates = RESEARCH_POSTS[project.researchId];
        if (!templates) continue;
        const region = project.jurisdiction
            ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.name
            : '';
        next = addPost(next, game, templates, { region });
    }
    for (const id of game.skills) {
        if (before.skills.includes(id) && before.developmentProgress[id] >= 1) continue;
        if (id === 'sns-intervention' && skillScale(game, id) > 0) {
            next = addPost(next, game, interventionTemplates(game), { intervention: true });
            continue;
        }
        const templates = skillTemplates(game, id);
        if (templates) next = addPost(next, game, templates);
    }
    if (next === feed && game.week !== before.week && game.week >= feed.nextPostWeek)
        next = addWorldPost(next, game, history);
    if (next === feed) return feed;
    const interval =
        6 + Math.floor(seededValue(game.seed + next.sequence * 7919, 'social-interval') * 7);
    return { ...next, nextPostWeek: game.week + interval };
}
