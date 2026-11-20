export const METRIC_CHANGE_THRESHOLD = 0.01;
export const METRIC_CHANGE_DURATION = 2400;
export const MAP_METRICS = [
    { key: 'favorability', label: '信頼度' },
    { key: 'adoption', label: 'AI利用' },
    { key: 'dependent', label: 'AI依存' },
    { key: 'antiAI', label: 'AI利用拒否' },
] as const;

export type MapMetricState = Record<(typeof MAP_METRICS)[number]['key'], number>;

/** 世界規模の小さな変化だけを平方根で補正し、表示量を地域間で分配する。 */
export function correctGlobalMetricDeltas(deltas: MapMetricState[]): MapMetricState[] {
    const corrected = deltas.map((delta) => ({ ...delta }));
    for (const { key } of MAP_METRICS) {
        // 地域ごとの最低個数は設けず、正負それぞれの表示量を世界全体で積算する。
        const remainder = { up: 0.5, down: 0.5 };
        for (const delta of corrected) {
            const amount = Math.abs(delta[key]);
            if (amount < 1e-9 || amount >= METRIC_CHANGE_THRESHOLD) continue;
            const direction = delta[key] > 0 ? 'up' : 'down';
            remainder[direction] += Math.sqrt(amount / METRIC_CHANGE_THRESHOLD);
            const count = Math.floor(remainder[direction]);
            remainder[direction] -= count;
            delta[key] = Math.sign(delta[key]) * count * METRIC_CHANGE_THRESHOLD;
        }
    }
    return corrected;
}

export interface MetricChange {
    area: number;
    metric: (typeof MAP_METRICS)[number]['key'];
    label: string;
    delta: number;
}

export interface MetricAppearance {
    area: number;
    at: number;
}

/** 地域ごとに間隔を空け、世界同時の変化も同じ時間枠内に表示する。 */
export function scheduleMetricChanges(
    changes: MetricChange[],
    reservations: MetricAppearance[],
    now: number,
    window: number,
    spacing: number,
) {
    const appearances = reservations.filter(({ at }) => at > now - spacing);
    const interval = (window - 100) / Math.max(1, changes.length);
    return changes.flatMap((change, index) => {
        let at = now + 100 + (index + 0.1 + Math.random() * 0.8) * interval;
        for (const reserved of appearances
            .filter((item) => item.area === change.area)
            .sort((a, b) => a.at - b.at)) {
            if (reserved.at > at + spacing) break;
            if (Math.abs(reserved.at - at) < spacing) at = reserved.at + spacing;
        }
        if (at > now + window) return [];
        appearances.push({ area: change.area, at });
        return [{ change, at }];
    });
}

export function detectMetricChanges(
    previous: MapMetricState[],
    current: MapMetricState[],
): MetricChange[] {
    return current.flatMap((state, area) => {
        const before = previous[area];
        if (!before) return [];
        return MAP_METRICS.flatMap(({ key, label }) => {
            const delta = state[key] - before[key];
            if (!Number.isFinite(delta)) return [];
            // 1ポイントごとに通知する。大きな変化もまとめず、端数は次回へ残す。
            const count = Math.floor((Math.abs(delta) + 1e-9) / METRIC_CHANGE_THRESHOLD);
            return Array.from({ length: count }, () => ({
                area,
                metric: key,
                label,
                delta: Math.sign(delta) * METRIC_CHANGE_THRESHOLD,
            }));
        });
    });
}

/** 通知した1ポイント分だけ基準を進め、閾値未満の端数を保持する。 */
export function accumulateMetricChanges(baseline: MapMetricState[], current: MapMetricState[]) {
    const changes = detectMetricChanges(baseline, current);
    const nextBaseline = current.map((state, area) => ({ ...(baseline[area] ?? state) }));
    for (const change of changes) {
        nextBaseline[change.area][change.metric] += change.delta;
    }
    return { changes, baseline: nextBaseline };
}

/** 一斉変化では全地域を先に一巡させ、一部地域の大量通知による表示枠の独占を防ぐ。 */
export function spreadMetricChanges(changes: MetricChange[], capacity: number): MetricChange[] {
    const groups = new Map<number, MetricChange[]>();
    for (const change of changes) {
        const group = groups.get(change.area);
        if (group) group.push(change);
        else groups.set(change.area, [change]);
    }
    const queues = [...groups.values()];
    const selected: MetricChange[] = [];
    for (let round = 0; selected.length < capacity; round++) {
        let found = false;
        for (const queue of queues) {
            if (!queue[round]) continue;
            found = true;
            selected.push(queue[round]);
            if (selected.length >= capacity) break;
        }
        if (!found) break;
    }
    return selected;
}
