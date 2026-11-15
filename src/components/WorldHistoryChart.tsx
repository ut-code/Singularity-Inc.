import { useId, useState } from 'react';
import { calendarParts, DAYS_PER_WEEK } from '../game/calendar';
import { STAGE_COLORS, WORLD_POPULATION } from '../game/data';
import type { WorldHistoryPoint } from '../game/metrics';

const SERIES = [
    { key: 'favorability', label: '信頼度', color: 'var(--text)', dashed: true },
    { key: 'adoption', label: 'AI利用人口', color: STAGE_COLORS[1], dashed: false },
    { key: 'dependent', label: 'AI依存人口', color: STAGE_COLORS[2], dashed: false },
    { key: 'antiAI', label: '利用拒否人口', color: STAGE_COLORS[3], dashed: false },
] as const;
const WIDTH = 800;
const HEIGHT = 290;
const LEFT = 58;
const RIGHT = 80;
const TOP = 30;
const BOTTOM = 52;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;
const formatNumber = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 });
const people = (share: number) => `${formatNumber.format((share * WORLD_POPULATION) / 100)}億人`;
function gameDate(week: number) {
    const date = calendarParts(week, 0);
    return `${date.year}年${date.month}月${date.day}日`;
}

function dateTicks(maxWeek: number) {
    const start = calendarParts(0, 0),
        end = calendarParts(maxWeek, 0);
    const firstMonth = start.year * 12 + start.month - 1;
    const lastMonth = end.year * 12 + end.month - 1;
    const months = lastMonth - firstMonth;
    const step =
        months <= 6 ? 1 : months <= 18 ? 3 : months <= 36 ? 6 : 12 * Math.ceil(months / 60);
    const startTime = Date.UTC(start.year, start.month - 1, start.day);
    const ticks = [{ week: 0, label: `${start.year}/${start.month}` }];
    for (let month = Math.ceil(firstMonth / step) * step; month <= lastMonth; month += step) {
        const year = Math.floor(month / 12),
            monthOfYear = month % 12;
        const week = (Date.UTC(year, monthOfYear, 1) - startTime) / (DAYS_PER_WEEK * 86_400_000);
        if (((week - ticks.at(-1)!.week) / maxWeek) * PLOT_WIDTH < 80) continue;
        ticks.push({ week, label: `${year}/${monthOfYear + 1}` });
    }
    return ticks;
}

/** 同じ高さが信頼度の割合と世界人口の割合に対応する、二軸の折れ線グラフ。 */
export function WorldHistoryChart({ history }: { history: WorldHistoryPoint[] }) {
    const titleId = useId();
    const [selected, setSelected] = useState<number | null>(null);
    if (!history.length) return null;
    const last = history.at(-1)!;
    const maxWeek = Math.max(1, last.week);
    const activeIndex = selected ?? history.length - 1;
    const active = history[activeIndex];
    const x = (week: number) => LEFT + (week / maxWeek) * PLOT_WIDTH;
    const y = (share: number) => TOP + (1 - share) * PLOT_HEIGHT;
    const timeTicks = dateTicks(maxWeek);
    return (
        <figure className="world-history">
            <figcaption>
                <strong>世界全体の推移</strong>
                <span>{gameDate(active.week)}</span>
            </figcaption>
            <div
                className="world-history-plot"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={maxWeek}
                aria-valuenow={active.week}
                aria-valuetext={`${gameDate(active.week)}、信頼度${formatNumber.format(active.favorability * 100)}%、AI利用人口${people(active.adoption)}、AI依存人口${people(active.dependent)}、利用拒否人口${people(active.antiAI)}`}
                aria-orientation="horizontal"
                aria-labelledby={titleId}
                tabIndex={0}
                onBlur={() => setSelected(null)}
                onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    event.stopPropagation();
                    setSelected(
                        Math.max(
                            0,
                            Math.min(
                                history.length - 1,
                                activeIndex + (event.key === 'ArrowLeft' ? -1 : 1),
                            ),
                        ),
                    );
                }}
            >
                <svg
                    className="world-history-svg"
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    role="img"
                    aria-labelledby={titleId}
                    onPointerMove={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const coordinate = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
                        const week = Math.max(
                            0,
                            Math.min(maxWeek, ((coordinate - LEFT) / PLOT_WIDTH) * maxWeek),
                        );
                        let index = 0;
                        for (let i = 1; i < history.length; i++)
                            if (
                                Math.abs(history[i].week - week) <
                                Math.abs(history[index].week - week)
                            )
                                index = i;
                        setSelected(index);
                    }}
                    onPointerLeave={() => setSelected(null)}
                >
                    <title id={titleId}>
                        世界全体の信頼度とAI利用・AI依存・利用拒否人口の推移。横軸はゲーム内の日時、左軸は信頼度、右軸は人口。左右キーで各時点を確認できます。
                    </title>
                    <text x={LEFT} y={15} className="history-axis-label">
                        信頼度
                    </text>
                    <text x={WIDTH - RIGHT + 12} y={15} className="history-axis-label">
                        人口
                    </text>
                    {[0, 0.25, 0.5, 0.75, 1].map((value) => (
                        <g key={value}>
                            <line
                                x1={LEFT}
                                x2={WIDTH - RIGHT}
                                y1={y(value)}
                                y2={y(value)}
                                className="history-grid"
                            />
                            <text x={LEFT - 12} y={y(value) + 4} textAnchor="end">
                                {value * 100}%
                            </text>
                            <text x={WIDTH - RIGHT + 12} y={y(value) + 4}>
                                {people(value)}
                            </text>
                        </g>
                    ))}
                    {timeTicks.map(({ week, label }) => {
                        return (
                            <g key={week}>
                                <line
                                    x1={x(week)}
                                    x2={x(week)}
                                    y1={TOP}
                                    y2={HEIGHT - BOTTOM}
                                    className="history-grid history-grid-vertical"
                                />
                                <text x={x(week)} y={HEIGHT - BOTTOM + 22} textAnchor="middle">
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                    <path
                        d={`M${LEFT},${TOP} V${HEIGHT - BOTTOM} H${WIDTH - RIGHT} V${TOP}`}
                        className="history-axes"
                    />
                    <text
                        x={LEFT + PLOT_WIDTH / 2}
                        y={HEIGHT - 4}
                        textAnchor="middle"
                        className="history-axis-label"
                    >
                        ゲーム内の日時
                    </text>
                    {SERIES.map((series) => (
                        <path
                            key={series.key}
                            d={history
                                .map(
                                    (point, index) =>
                                        `${index ? 'L' : 'M'}${x(point.week).toFixed(2)},${y(point[series.key]).toFixed(2)}`,
                                )
                                .join(' ')}
                            fill="none"
                            stroke={series.color}
                            strokeWidth={2.4}
                            strokeDasharray={series.dashed ? '7 5' : undefined}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {selected !== null && (
                        <g>
                            <line
                                x1={x(active.week)}
                                x2={x(active.week)}
                                y1={TOP}
                                y2={HEIGHT - BOTTOM}
                                className="history-cursor"
                            />
                            {SERIES.map((series) => (
                                <circle
                                    key={series.key}
                                    cx={x(active.week)}
                                    cy={y(active[series.key])}
                                    r={4}
                                    fill={series.color}
                                />
                            ))}
                        </g>
                    )}
                </svg>
            </div>
            <dl className="world-history-legend" aria-live="polite">
                {SERIES.map((series) => (
                    <div
                        key={series.key}
                        title={series.key === 'adoption' ? 'AI依存人口を含みます' : undefined}
                    >
                        <dt>
                            <i style={{ backgroundColor: series.color }} />
                            {series.label}
                        </dt>
                        <dd>
                            {series.key === 'favorability'
                                ? `${formatNumber.format(active.favorability * 100)}%`
                                : people(active[series.key])}
                        </dd>
                    </div>
                ))}
            </dl>
        </figure>
    );
}
