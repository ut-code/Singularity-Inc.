import { AREAS, WEEK_MS } from './data.ts';
import { earnedSkillPoints } from './economy.ts';
import { createGame } from './engine.ts';
import { clamp, metrics } from './metrics.ts';
import { seededValue } from './random.ts';
import { politicalAccess } from './regions.ts';
import type { ResearchProject } from './research/types.ts';
import { SKILLS } from './skills.ts';
import { ENCOUNTER_RESPONSE_WEEKS } from './society/encounters.ts';
import type { GameState } from './types.ts';

const MIDDLE_SKILLS = [
    'reason',
    'conversation',
    'lightweight',
    'retrieval',
    'personalize',
    'memory',
    'automation',
    'integration',
    'knowledge',
    'science',
    'explanation',
];
const LATE_SKILLS = [
    ...MIDDLE_SKILLS,
    'care',
    'learning-transfer',
    'decision',
    'public',
    'distributed',
    'companion',
    'habit',
    'capability-concealment',
    'counterexample-learning',
    'swarm',
];

/** 実際のプレイ進行とは独立した、画面・操作の検証用スナップショット。 */
export function createDebugScenario(current: GameState, targetWeek: number): GameState {
    const late = targetWeek * WEEK_MS >= 6 * 60_000;
    const skills = late ? LATE_SKILLS : MIDDLE_SKILLS;
    const progress: Record<string, number> = late ? { swarm: 0.5, habit: 0.65 } : { science: 0.5 };
    const game: GameState = {
        ...createGame(current.seed, current.origin, current.name),
        started: true,
        week: targetWeek,
        speed: 0,
        skills: [...skills],
        developmentProgress: Object.fromEntries(
            SKILLS.map((skill) => [
                skill.id,
                skills.includes(skill.id) ? (progress[skill.id] ?? 1) : 0,
            ]),
        ),
        skillPoints: late ? 12 : 8,
        controlStarted: true,
        controlProgress: late ? 0.83 : 0.45,
        areas: AREAS.map((area, index) => {
            const readiness = clamp(
                area.digital * 0.55 +
                    politicalAccess(current.origin, index) * 0.25 +
                    seededValue(current.seed, `debug-area:${area.id}`) * 0.2 +
                    (index === current.origin ? 0.1 : 0),
            );
            return {
                autonomous: (late ? 0.1 : 0.2) + readiness * 0.1,
                dependent: (late ? 0.45 : 0.12) + readiness * (late ? 0.25 : 0.16),
                antiAI: (late ? 0.2 : 0.08) * (1 - readiness * 0.5),
                favorability: (late ? 0.48 : 0.6) + readiness * 0.1,
            };
        }),
        lastResearchWeek: targetWeek,
        nextEncounterWeek: targetWeek + 16,
        nextScandalWeek: targetWeek + 80,
    };
    const project = (
        id: string,
        instituteId: string,
        completion: number,
        jurisdiction?: string,
    ): ResearchProject => ({
        id: jurisdiction ? `${id}:${jurisdiction}` : id,
        researchId: id,
        instituteId,
        jurisdiction,
        progress: completion,
        startedWeek: targetWeek - (completion === 100 ? 80 : 20),
        status: completion === 100 ? 'published' : 'active',
        ...(completion === 100 ? { publishedWeek: targetWeek - 40 } : {}),
    });
    game.researchProjects = [
        project('dependence-study', 'metrica', 100),
        project('decision-tracing', 'thames', 100),
        ...(late
            ? [
                  project('memory-portability', 'montroyal', 100),
                  project('cognitive-recovery', 'pearl', 100),
                  project('informed-consent', 'bunkyo', 100, 'japan'),
                  project('intent-decoding', 'alpine', 70),
                  project('independent-learning', 'cape', 40),
                  project('data-portability', 'metrica', 55, 'us'),
              ]
            : [
                  project('cognitive-recovery', 'metrica', 35),
                  project('memory-portability', 'pearl', 40),
                  project('informed-consent', 'alpine', 35, 'eu'),
              ]),
    ];
    game.researchReadyWeeks = Object.fromEntries(
        game.researchProjects.map((item) => [item.researchId, item.startedWeek]),
    );
    game.encounters = ['school-network', 'false-citation'].map((id, index) => {
        return {
            id: `${id}:${index}`,
            definitionId: id,
            area: index === 0 ? 23 : 3,
            startedWeek: targetWeek - 8,
            deadline: targetWeek - 8 + ENCOUNTER_RESPONSE_WEEKS,
            strength: late ? 1.25 : 1.05,
            status: 'pending',
        };
    });
    const world = metrics(game);
    game.peakAdoption = world.adoption;
    game.peakDependency = world.dependent;
    game.earnedPoints = earnedSkillPoints(game.week, world.adoption, world.dependent);
    return game;
}
