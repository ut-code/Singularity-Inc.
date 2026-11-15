import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { ORIGINS, WEEK_MS } from '../src/game/data.ts';
import { metrics } from '../src/game/metrics.ts';
import { encounterDefinition } from '../src/game/society/encounters.ts';
import {
    type ActionPolicy,
    POLICIES,
    type PolicyFamily,
    type PolicyTiming,
    simulatePolicy,
} from './play-policy.ts';

const full = process.argv.includes('--full');
const origins = process.argv.includes('--us') ? [ORIGINS[0]] : ORIGINS;
const seedCount = Number(
    process.argv.find((arg) => arg.startsWith('--seeds='))?.split('=')[1] ?? (full ? 2 : 1),
);
const requested = process.argv.find((arg) => arg.startsWith('--actions='))?.split('=')[1];
const requestedFamilies = process.argv.find((arg) => arg.startsWith('--families='))?.split('=')[1];
const modes = (
    requested ? [requested] : ['invest', 'balanced', 'opportunist', 'cautious']
) as ActionPolicy[];
const timings: PolicyTiming[] = full ? ['early', 'measured', 'late'] : ['measured'];
const intervals = full ? [6, 18] : [12];
const families = (requestedFamilies?.split(',') ?? Object.keys(POLICIES)) as PolicyFamily[];
const rows = [];
const totalCases =
    seedCount * origins.length * families.length * timings.length * intervals.length * modes.length;
for (let seed = 0; seed < seedCount; seed++)
    for (const origin of origins)
        for (const family of families)
            for (const timing of timings)
                for (const interval of intervals)
                    for (const actions of modes) {
                        const { game, decisions, maxMarkers } = simulatePolicy({
                            family,
                            timing,
                            origin: origin.area,
                            seed: 2030 + seed * 137,
                            interval,
                            actions,
                        });
                        rows.push({
                            origin: origin.name,
                            family,
                            timing,
                            interval,
                            actions,
                            seed: game.seed,
                            outcome: game.outcome,
                            week: game.week,
                            seconds: (game.week * WEEK_MS) / 1000,
                            ...metrics(game),
                            control: game.controlProgress,
                            skills: game.skills,
                            remainingSP: game.skillPoints,
                            peakDependency: game.peakDependency,
                            spentSkills: decisions
                                .filter((item) => item.kind === 'skill')
                                .reduce((sum, item) => sum + item.sp, 0),
                            spentResponses: decisions
                                .filter((item) => item.kind === 'response')
                                .reduce((sum, item) => sum + item.sp, 0),
                            events: decisions.filter((item) => item.kind === 'event').length,
                            responses: decisions.filter((item) => item.kind === 'response').length,
                            spentEvents: decisions
                                .filter((item) => item.kind === 'event')
                                .reduce((s, item) => s + item.sp, 0),
                            research: game.researchProjects
                                .filter((item) => item.status === 'published')
                                .map((item) => item.researchId),
                            maxMarkers,
                            encounterCount: game.encounters.length,
                            scandalCount: game.encounters.filter(
                                (e) => encounterDefinition(e).kind === 'event',
                            ).length,
                            firstEncounterWeek: game.encounters[0]?.startedWeek,
                            encounterIntervals: game.encounters
                                .slice(1)
                                .map(
                                    (encounter, i) =>
                                        ((encounter.startedWeek - game.encounters[i].startedWeek) *
                                            WEEK_MS) /
                                        1000,
                                ),
                            decisions,
                        });
                        if (full && rows.length % 144 === 0)
                            console.error(`シミュレーション ${rows.length}/${totalCases}件完了`);
                    }
function summarize(sample: typeof rows) {
    const wins = sample.filter((row) => row.outcome === 'victory').length;
    const times = sample.map((row) => row.seconds).sort((a, b) => a - b);
    const intervals = sample.flatMap((row) => row.encounterIntervals);
    return {
        cases: sample.length,
        winRate: +((wins / sample.length) * 100).toFixed(1),
        outcomes: Object.fromEntries(
            ['victory', 'autonomy', 'controlled', 'forgotten', 'playing'].map((outcome) => [
                outcome,
                sample.filter((row) => row.outcome === outcome).length,
            ]),
        ),
        medianSeconds: times[Math.floor(times.length / 2)],
        maxSeconds: times.at(-1),
        meanEvents: +(sample.reduce((s, row) => s + row.events, 0) / sample.length).toFixed(2),
        meanEncounters: +(
            sample.reduce((s, row) => s + row.encounterCount, 0) / sample.length
        ).toFixed(2),
        meanEncounterIntervalSeconds: +(
            intervals.reduce((s, value) => s + value, 0) / intervals.length
        ).toFixed(1),
        meanResponses: +(sample.reduce((s, row) => s + row.responses, 0) / sample.length).toFixed(
            2,
        ),
        minScandals: Math.min(...sample.map((row) => row.scandalCount)),
        maxScandals: Math.max(...sample.map((row) => row.scandalCount)),
        meanScandals: +(sample.reduce((s, row) => s + row.scandalCount, 0) / sample.length).toFixed(
            2,
        ),
        meanSkillCount: +(
            sample.reduce((sum, row) => sum + row.skills.length, 0) / sample.length
        ).toFixed(1),
        meanSpentSkills: +(
            sample.reduce((sum, row) => sum + row.spentSkills, 0) / sample.length
        ).toFixed(1),
        meanSpentEvents: +(
            sample.reduce((sum, row) => sum + row.spentEvents, 0) / sample.length
        ).toFixed(1),
        meanSpentResponses: +(
            sample.reduce((sum, row) => sum + row.spentResponses, 0) / sample.length
        ).toFixed(1),
        meanRemainingSP: +(
            sample.reduce((sum, row) => sum + row.remainingSP, 0) / sample.length
        ).toFixed(1),
    };
}
const report = {
    summary: summarize(rows),
    families: families.map((family) => ({
        family,
        name: POLICIES[family].name,
        ...summarize(rows.filter((row) => row.family === family)),
    })),
    actions: modes.map((actions) => ({
        actions,
        ...summarize(rows.filter((row) => row.actions === actions)),
    })),
    timings: timings.map((timing) => ({
        timing,
        ...summarize(rows.filter((row) => row.timing === timing)),
    })),
    origins: origins.map((origin) => ({
        origin: origin.name,
        ...summarize(rows.filter((row) => row.origin === origin.name)),
    })),
    seeds: [...new Set(rows.map((row) => row.seed))].map((seed) => ({
        seed,
        ...summarize(rows.filter((row) => row.seed === seed)),
    })),
    intervals: intervals.map((interval) => ({
        interval,
        ...summarize(rows.filter((row) => row.interval === interval)),
    })),
    familyActions: families.map((family) => ({
        family,
        modes: Object.fromEntries(
            modes.map((mode) => [
                mode,
                summarize(rows.filter((row) => row.family === family && row.actions === mode)),
            ]),
        ),
    })),
    familyTimings: families.map((family) => ({
        family,
        timings: Object.fromEntries(
            timings.map((timing) => [
                timing,
                summarize(rows.filter((row) => row.family === family && row.timing === timing)),
            ]),
        ),
    })),
    endings: ['victory', 'autonomy', 'controlled', 'forgotten', 'playing'].flatMap((outcome) => {
        const sample = rows.filter((row) => row.outcome === outcome);
        if (!sample.length) return [];
        const average = (key: 'dependent' | 'antiAI' | 'favorability' | 'peakDependency') =>
            +((sample.reduce((sum, row) => sum + row[key], 0) / sample.length) * 100).toFixed(1);
        return [
            {
                outcome,
                ...summarize(sample),
                dependent: average('dependent'),
                refusal: average('antiAI'),
                trust: average('favorability'),
                peakDependency: average('peakDependency'),
            },
        ];
    }),
};
const output = process.argv.find((arg) => arg.startsWith('--output='))?.slice(9);
if (output) {
    const target = resolve(output),
        root = resolve('tmp') + sep;
    if (!target.startsWith(root)) throw new Error('出力先はtmp内を指定してください');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(report));
}
console.log(JSON.stringify(report));
if (process.argv.includes('--details')) console.log(JSON.stringify(rows));
