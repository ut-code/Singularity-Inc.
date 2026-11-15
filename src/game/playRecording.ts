import { ENCOUNTERS } from '../content/encounters';
import { RESEARCH_TOPICS } from '../content/research';
import { WEEK_MS } from './data';
import { metrics } from './metrics';
import { SKILLS } from './skills';
import type { GameState } from './types';
export interface PlayRecording {
    version: 1;
    startedAt: string;
    name: string;
    seed: number;
    origin: number;
    initial: GameState;
    frames: unknown[];
    actions: unknown[];
    regions: unknown[];
    rules: unknown;
    final?: GameState;
}
export function beginRecording(game: GameState): PlayRecording {
    return {
        version: 1,
        startedAt: new Date().toISOString(),
        name: game.name,
        seed: game.seed,
        origin: game.origin,
        initial: game,
        frames: [],
        actions: [],
        regions: [],
        rules: {
            weekMilliseconds: WEEK_MS,
            skills: SKILLS,
            research: RESEARCH_TOPICS,
            encounters: ENCOUNTERS,
        },
    };
}
export function recordChange(record: PlayRecording, before: GameState, after: GameState) {
    if (after.week !== before.week) {
        record.frames.push({
            week: after.week,
            ...metrics(after),
            control: after.controlProgress,
            sp: after.skillPoints,
        });
        if (after.week % 8 === 0) record.regions.push({ week: after.week, areas: after.areas });
    }
    for (const id of after.skills)
        if (!before.skills.includes(id))
            record.actions.push({
                week: after.week,
                kind: 'skill',
                id,
                spBefore: before.skillPoints,
                spAfter: after.skillPoints,
            });
    for (const project of after.researchProjects)
        if (project.response && !before.researchProjects.find((p) => p.id === project.id)?.response)
            record.actions.push({
                week: after.week,
                kind: 'research-response',
                id: project.id,
                response: project.response,
            });
    for (const event of after.encounters)
        if (
            event.choiceId !== undefined &&
            before.encounters.find((e) => e.id === event.id)?.choiceId === undefined
        )
            record.actions.push({
                week: after.week,
                kind: 'encounter',
                id: event.id,
                choice: event.choiceId,
                areasBefore: before.areas,
                areasAfter: after.areas,
                spBefore: before.skillPoints,
                spAfter: after.skillPoints,
            });
    if (after.speed !== before.speed)
        record.actions.push({ week: after.week, kind: 'speed', speed: after.speed });
}
export async function saveRecording(record: PlayRecording) {
    const response = await fetch('/__debug/play-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json()) as { file: string };
}
