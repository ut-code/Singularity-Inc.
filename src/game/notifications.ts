import { AREAS } from './data.ts';
import { REGULAR_SP_INTERVAL_WEEKS } from './economy.ts';
import { researchTopic } from './research/system.ts';
import { SKILLS } from './skills.ts';
import type { GameState } from './types.ts';

export interface GameNotification {
    id: string;
    week: number;
    text: string;
    kind: 'milestone' | 'event' | 'warning';
    researchProjectId?: string;
    skillId?: string;
}
export interface NotificationState {
    items: GameNotification[];
    seen: Set<string>;
}
export function createNotifications(): NotificationState {
    return { items: [], seen: new Set() };
}
export function updateNotifications(
    before: GameState,
    game: GameState,
    state: NotificationState,
): NotificationState {
    const incoming: GameNotification[] = [];
    const add = (
        id: string,
        text: string,
        kind: GameNotification['kind'],
        details?: Pick<GameNotification, 'researchProjectId' | 'skillId'>,
    ) => incoming.push({ id, week: game.week, text, kind, ...details });
    if (!before.started && game.started)
        add(
            `start:${game.seed}`,
            `AIエージェント「${game.name}」の使用が「${AREAS[game.origin].name}」で始まりました`,
            'event',
        );
    const regular =
        Math.floor(game.week / REGULAR_SP_INTERVAL_WEEKS) -
        Math.floor(before.week / REGULAR_SP_INTERVAL_WEEKS);
    if (regular > 0) add(`sp:${game.week}`, `定期支給 · +${regular} SP`, 'milestone');
    for (const skill of SKILLS)
        if (
            game.skills.includes(skill.id) &&
            game.developmentProgress[skill.id] >= 1 &&
            (before.developmentProgress[skill.id] ?? 0) < 1
        )
            add(`skill-complete:${skill.id}`, `${skill.name}の開発が完了しました`, 'milestone', {
                skillId: skill.id,
            });
    for (const project of game.researchProjects)
        if (
            project.status === 'active' &&
            !before.researchProjects.some((old) => old.id === project.id)
        )
            add(`research:${project.id}`, `${researchTopic(project).name}が始まった`, 'warning', {
                researchProjectId: project.id,
            });
    for (const percent of [75, 90])
        if (game.controlProgress >= percent / 100 && before.controlProgress < percent / 100)
            add(`control:${percent}`, `AI制御研究が${percent}%に到達`, 'warning');
    const fresh = incoming.filter((item) => !state.seen.has(item.id));
    if (!fresh.length) return state;
    return {
        items: [...fresh.reverse(), ...state.items].slice(0, 2),
        seen: new Set([...state.seen, ...fresh.map((item) => item.id)]),
    };
}
