import { clamp, metrics } from '../metrics.ts';
import type { AreaState, GameState } from '../types.ts';

function ramp(value: number, start: number, end: number) {
    const x = clamp((value - start) / (end - start));
    return x * x * (3 - 2 * x);
}

/** 世界人口の最大0.4ポイントを毎週移す。残り人口が減っても移動量を保つ。 */
function finishingRate(share: number) {
    return share < 1 ? (0.004 * ramp(share, 0.9, 0.98)) / (1 - share) : 0;
}

/** 既存の人口と公表された根拠から同調圧力を求める。 */
export function consensusPressure(
    game: GameState,
    index: number,
    evidence: number,
    delegation: number,
) {
    const world = metrics(game);
    const area = game.areas[index];
    const finalDependency = ramp(world.dependent, 0.9, 0.98);
    const localResistance = ramp(area.antiAI, 0.1, 0.6) * (1 - ramp(world.dependent, 0.95, 0.99));
    // 90%以降は一定量の人口移動を滑らかに加え、端数だけを待つ時間を短くする。
    return {
        dependency:
            ((0.1 + 0.04 * finalDependency) *
                (delegation / (0.6 + delegation)) *
                ramp(world.dependent, 0.8, 0.98) *
                (1 - localResistance)) /
                (1 + evidence * 40 * (1 - finalDependency)) +
            finishingRate(world.dependent),
        // 拒否が広がり、公表された根拠もあると、依存していた人にも離脱が広がる。
        refusal:
            (ramp(world.antiAI, 0.3, 0.8) * 0.1 * evidence) / (0.01 + evidence) +
            finishingRate(world.antiAI),
    };
}

/** 通常の人口移動後に残った人口を移し、人口の総量を保つ。 */
export function applyConsensus(
    area: AreaState,
    pressure: ReturnType<typeof consensusPressure>,
    recoveryScale: number,
): AreaState {
    const dependencyRate = Math.min(1, pressure.dependency);
    const dependent = area.dependent + (1 - area.dependent) * dependencyRate;
    const autonomous = area.autonomous * (1 - dependencyRate);
    const antiAI = area.antiAI * (1 - dependencyRate);
    const refusalRate = Math.min(1, pressure.refusal);
    return {
        ...area,
        dependent: dependent * (1 - refusalRate * recoveryScale),
        autonomous: autonomous * (1 - refusalRate),
        antiAI: antiAI + (1 - antiAI - dependent + dependent * recoveryScale) * refusalRate,
    };
}
