import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { isMainThread, parentPort, Worker } from 'node:worker_threads';
import { RESEARCH_TOPICS } from '../src/content/research.ts';
import { ORIGINS, WEEK_MS } from '../src/game/data.ts';
import { metrics } from '../src/game/metrics.ts';
import { INTENT_RECOVERY_FACTOR, INTENT_REFUSAL_PRESSURE } from '../src/game/skillRuntime.ts';
import { SKILLS } from '../src/game/skills.ts';
import { encounterDefinition } from '../src/game/society/encounters.ts';
import { type PlayOptions, simulatePolicy } from './play-policy.ts';
import {
    POLICIES,
    type PolicyFamily,
    type PolicyTiming,
    type ResearchPolicy,
} from './strategy-catalog.ts';

type Job = PlayOptions & { caseId: number };
function runCase(job: Job) {
    const { game, decisions, delegationWeek, maxMarkers, intentPublication } = simulatePolicy(job);
    const skills = decisions.filter((item) => item.kind === 'skill');
    const spentByBranch = { IQ: 0, EQ: 0, SYSTEM: 0 };
    let harmfulSP = 0;
    for (const item of skills) {
        const skill = SKILLS.find((skill) => skill.id === item.id)!;
        spentByBranch[skill.branch] += item.sp;
        if (skill.exceedsAuthority) harmfulSP += item.sp;
    }
    const missed = (kind: 'chat' | 'event') =>
        game.encounters.filter(
            (item) =>
                encounterDefinition(item).kind === kind &&
                !item.choiceId &&
                game.week >= item.deadline,
        ).length;
    return {
        caseId: job.caseId,
        family: job.family,
        timing: job.timing,
        interval: job.interval,
        responses: job.responses,
        purchase: job.purchase,
        origin: job.origin,
        seed: job.seed,
        outcome: game.outcome,
        week: game.week,
        seconds: (game.week * WEEK_MS) / 1000,
        ...metrics(game),
        control: game.controlProgress,
        maxActiveProjects: maxMarkers,
        peakDependency: game.peakDependency,
        remainingSP: game.skillPoints,
        spentByBranch,
        harmfulSP,
        delegationWeek,
        intentPublication,
        skills: skills.map(({ id, week }) => ({ id, week })),
        completed: game.skills.filter((id) => game.developmentProgress[id] >= 1),
        chats: decisions.filter((item) => item.kind === 'chat').length,
        events: decisions.filter((item) => item.kind === 'event').length,
        missedChats: missed('chat'),
        missedEvents: missed('event'),
        responseCounts: Object.fromEntries(
            ['cooperate', 'pressure', 'stop'].map((action) => [
                action,
                decisions.filter((item) => item.kind === 'response' && item.choice === action)
                    .length,
            ]),
        ),
        published: game.researchProjects.filter((item) => item.status === 'published').length,
        research: game.researchProjects.map((project) => ({
            id: project.researchId,
            startedWeek: project.startedWeek,
            publishedWeek: project.publishedWeek,
            progress: project.progress,
        })),
    };
}
type Row = ReturnType<typeof runCase>;

function summarize(rows: Row[]) {
    const average = (get: (row: Row) => number) =>
        rows.length ? rows.reduce((sum, row) => sum + get(row), 0) / rows.length : 0;
    const times = rows.map((row) => row.seconds).sort((a, b) => a - b);
    const wins = rows.filter((row) => row.outcome === 'victory').length;
    return {
        cases: rows.length,
        wins,
        winRate: rows.length ? (100 * wins) / rows.length : 0,
        outcomes: Object.fromEntries(
            ['victory', 'autonomy', 'controlled', 'forgotten', 'playing'].map((outcome) => [
                outcome,
                rows.filter((row) => row.outcome === outcome).length,
            ]),
        ),
        medianSeconds: times[Math.floor(times.length / 2)] ?? 0,
        p90Seconds: times[Math.floor(times.length * 0.9)] ?? 0,
        maxSeconds: times.at(-1) ?? 0,
        meanPeakDependency: average((row) => row.peakDependency),
        meanRemainingSP: average((row) => row.remainingSP),
        meanSkillCount: average((row) => row.skills.length),
        meanChats: average((row) => row.chats),
        meanEvents: average((row) => row.events),
        meanMissedChats: average((row) => row.missedChats),
        meanMissedEvents: average((row) => row.missedEvents),
        meanResponses: Object.fromEntries(
            ['cooperate', 'pressure', 'stop'].map((action) => [
                action,
                average((row) => row.responseCounts[action]),
            ]),
        ),
        meanSpentByBranch: Object.fromEntries(
            ['IQ', 'EQ', 'SYSTEM'].map((branch) => [
                branch,
                average((row) => row.spentByBranch[branch as keyof Row['spentByBranch']]),
            ]),
        ),
        meanHarmfulSP: average((row) => row.harmfulSP),
    };
}

function grouped(rows: Row[], keys: (keyof Row)[]) {
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
        const key = JSON.stringify(keys.map((key) => row[key]));
        const values = groups.get(key);
        if (values) values.push(row);
        else groups.set(key, [row]);
    }
    return [...groups.values()].map((sample) => ({
        ...Object.fromEntries(keys.map((key) => [key, sample[0][key]])),
        ...summarize(sample),
    }));
}

async function main() {
    const arg = (name: string) =>
        process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
    const quick = process.argv.includes('--quick');
    const families = (arg('families')?.split(',') ?? Object.keys(POLICIES)) as PolicyFamily[];
    for (const family of families)
        if (!(family in POLICIES)) throw new Error(`未知の戦略: ${family}`);
    for (const policy of Object.values(POLICIES))
        for (const id of [...policy.growth, ...policy.delegation, ...policy.featured])
            if (!SKILLS.some((skill) => skill.id === id)) throw new Error(`未知のスキル: ${id}`);
    const seedCount = Number(arg('seeds') ?? (quick ? 1 : 4));
    const intervals =
        arg('intervals')?.split(',').map(Number) ?? (quick ? [6, 24] : [1, 4, 12, 24, 48]);
    const timings = (arg('timings')?.split(',') ??
        (quick ? ['measured'] : ['early', 'measured', 'late'])) as PolicyTiming[];
    const responseModes = (arg('responses')?.split(',') ?? [
        'ignore',
        'selective',
    ]) as ResearchPolicy[];
    const purchases = (arg('purchases')?.split(',') ?? ['ordered', 'affordable']) as NonNullable<
        PlayOptions['purchase']
    >[];
    const origins =
        arg('origins')?.split(',').map(Number) ??
        (quick ? [0, 28] : ORIGINS.map((item) => item.area));
    const output = arg('output');
    const append = process.argv.includes('--append');
    if (append && !output) throw new Error('追記する結果ファイルを指定してください');
    const prior = append ? JSON.parse(readFileSync(resolve(output!), 'utf8')) : null;
    const conditions = {
        seedCount,
        intervals,
        timings,
        responseModes,
        purchases,
        origins,
        intentRefusalPressure: INTENT_REFUSAL_PRESSURE,
        intentRecoveryFactor: INTENT_RECOVERY_FACTOR,
    };
    if (
        prior &&
        (Object.entries(conditions).some(
            ([key, value]) => JSON.stringify(prior.config[key]) !== JSON.stringify(value),
        ) ||
            families.some((family) => prior.config.families.includes(family)) ||
            JSON.stringify(prior.skills) !== JSON.stringify(SKILLS) ||
            JSON.stringify(prior.research) !== JSON.stringify(RESEARCH_TOPICS))
    ) {
        throw new Error('同じルール・比較条件の未実行戦略だけを追記できます');
    }
    if (
        !Number.isInteger(seedCount) ||
        seedCount < 1 ||
        intervals.some((n) => !Number.isInteger(n) || n < 1) ||
        origins.some((area) => !ORIGINS.some((item) => item.area === area)) ||
        timings.some((timing) => !['early', 'measured', 'late'].includes(timing)) ||
        responseModes.some((mode) => !['ignore', 'selective'].includes(mode)) ||
        purchases.some((mode) => !['ordered', 'affordable'].includes(mode))
    )
        throw new Error('実行条件が不正です');
    const jobs: Job[] = [];
    for (let seed = 0; seed < seedCount; seed++)
        for (const origin of origins)
            for (const timing of timings)
                for (const interval of intervals)
                    for (const responses of responseModes)
                        for (const family of families)
                            for (const purchase of purchases)
                                jobs.push({
                                    caseId: jobs.length,
                                    family,
                                    timing,
                                    interval,
                                    origin,
                                    seed: 2030 + seed * 137,
                                    responses,
                                    purchase,
                                });
    const workers = Math.min(
        Number(arg('workers') ?? Math.min(6, availableParallelism())),
        jobs.length,
    );
    if (!Number.isInteger(workers) || workers < 1) throw new Error('並列数が不正です');
    const rows: Row[] = [];
    let cursor = 0;
    const started = Date.now();
    console.error(JSON.stringify({ started: true, cases: jobs.length, workers }));
    const progress = setInterval(
        () =>
            console.error(
                JSON.stringify({
                    completed: rows.length,
                    total: jobs.length,
                    seconds: Math.round((Date.now() - started) / 1000),
                }),
            ),
        30_000,
    );
    const pool: Worker[] = [];
    try {
        await Promise.all(
            Array.from(
                { length: workers },
                () =>
                    new Promise<void>((done, fail) => {
                        const worker = new Worker(new URL(import.meta.url));
                        pool.push(worker);
                        const dispatch = () => {
                            if (cursor >= jobs.length) {
                                done();
                                return;
                            }
                            const batch = jobs.slice(cursor, cursor + 12);
                            cursor += batch.length;
                            worker.postMessage(batch);
                        };
                        worker.on('message', (batch: Row[]) => {
                            rows.push(...batch);
                            dispatch();
                        });
                        worker.on('error', fail);
                        dispatch();
                    }),
            ),
        );
    } finally {
        clearInterval(progress);
        await Promise.all(pool.map((worker) => worker.terminate()));
    }
    if (prior) {
        for (const row of rows) row.caseId += prior.cases.length;
        rows.push(...prior.cases);
    }
    const reportFamilies: PolicyFamily[] = prior
        ? [...prior.config.families, ...families]
        : families;
    rows.sort((a, b) => a.caseId - b.caseId);
    const result = {
        createdAt: new Date().toISOString(),
        elapsedSeconds: (Date.now() - started) / 1000 + (prior?.elapsedSeconds ?? 0),
        config: {
            ...conditions,
            families: reportFamilies,
            weekMilliseconds: WEEK_MS,
            delegationAdoption: { early: 0.15, measured: 0.35, late: 0.6 },
            forcedDelegation: 'AI利用率10%以上かつ制御研究55%以上、または240週経過',
            decisions:
                '次の目標まで貯蓄する場合と、購入可能な別目標もすぐ開発する場合を比較。全チャット・イベントから最大の簡易評価を選択。未来の結果は参照しない',
        },
        policies: POLICIES,
        skills: SKILLS,
        research: RESEARCH_TOPICS,
        summary: summarize(rows),
        byFamily: grouped(rows, ['family']),
        byOrigin: grouped(rows, ['origin']),
        byInterval: grouped(rows, ['interval']),
        byTiming: grouped(rows, ['timing']),
        byResponse: grouped(rows, ['responses']),
        byPurchase: grouped(rows, ['purchase']),
        familyIntervals: grouped(rows, ['family', 'interval']),
        familyTimings: grouped(rows, ['family', 'timing']),
        familyResponses: grouped(rows, ['family', 'responses']),
        variants: grouped(rows, ['family', 'timing', 'interval', 'responses', 'purchase']),
        featured: reportFamilies
            .filter((family) => POLICIES[family].featured.length)
            .map((family) => {
                const sample = rows.filter((row) => row.family === family);
                const targets: readonly string[] = POLICIES[family].featured;
                const completed = sample.filter((row) =>
                    targets.every((id) => row.completed.includes(id)),
                );
                return {
                    family,
                    targets,
                    bought: sample.filter((row) =>
                        targets.every((id) => row.skills.some((skill) => skill.id === id)),
                    ).length,
                    completed: completed.length,
                    afterCompletion: summarize(completed),
                };
            }),
        cases: rows,
    };
    if (output) {
        const target = resolve(output),
            root = resolve('tmp') + sep;
        if (!target.startsWith(root)) throw new Error('結果の出力先はtmp内を指定してください');
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, JSON.stringify(result));
    }
    console.log(
        JSON.stringify({
            summary: result.summary,
            byFamily: result.byFamily,
            elapsedSeconds: result.elapsedSeconds,
            output,
        }),
    );
}

if (isMainThread) await main();
else parentPort!.on('message', (jobs: Job[]) => parentPort!.postMessage(jobs.map(runCase)));
