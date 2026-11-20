import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { calendarParts } from '../game/calendar';
import { GAME_SPEED_MULTIPLIER, WEEK_MS } from '../game/data';
import { isGameActive } from '../game/session';
import { useGameStore } from '../state/gameStore';
import { usePresentationClock } from '../state/presentationClock';

/** 週内の経過時間を保持し、一時停止や速度変更でも日付を巻き戻さない。 */
export function GameClock({ blocked }: { blocked: boolean }) {
    const game = useGameStore((state) => state.game)!;
    const elapsed = useRef(0);
    const [fraction, setFraction] = useState(0);
    useEffect(() => {
        usePresentationClock.setState({ fraction: 0 });
    }, []);
    useEffect(() => {
        if (blocked || game.speed === 0) return;
        let previous = performance.now();
        const visibilityChanged = () => {
            previous = performance.now();
        };
        document.addEventListener('visibilitychange', visibilityChanged);
        let frame = 0;
        const animate = () => {
            const now = performance.now();
            // タブ復帰や処理落ちの遅れを、一度に大量の週次処理として取り戻さない。
            if (!document.hidden)
                elapsed.current +=
                    Math.min(now - previous, 250) * game.speed * GAME_SPEED_MULTIPLIER;
            previous = now;
            if (document.hidden) {
                frame = requestAnimationFrame(animate);
                return;
            }
            while (elapsed.current >= WEEK_MS) {
                const current = useGameStore.getState().game!;
                if (!isGameActive(current)) break;
                elapsed.current -= WEEK_MS;
                usePresentationClock.setState({ fraction: 0 });
                useGameStore.getState().tick();
            }
            const nextFraction = Math.min(1, elapsed.current / WEEK_MS);
            usePresentationClock.setState({ fraction: nextFraction });
            setFraction(nextFraction);
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', visibilityChanged);
        };
    }, [blocked, game.speed]);
    const date = calendarParts(game.week, fraction);
    return (
        <section className="game-clock glass" aria-label="時間の操作">
            <div className="clock-row">
                <time
                    className="calendar-date"
                    dateTime={`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`}
                >
                    <span>{date.year}</span>
                    <span>年</span>
                    <span>{date.month}</span>
                    <span>月</span>
                    <span>{date.day}</span>
                    <span>日</span>
                </time>
                <div className="time-controls">
                    <button
                        type="button"
                        aria-label={game.speed === 0 ? '再開' : '一時停止'}
                        onClick={() => useGameStore.getState().speed(game.speed === 0 ? 1 : 0)}
                    >
                        {game.speed === 0 ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    {([1, 2] as const).map((speed) => (
                        <button
                            type="button"
                            key={speed}
                            aria-pressed={game.speed === speed}
                            onClick={() => useGameStore.getState().speed(speed)}
                        >
                            {speed}×
                        </button>
                    ))}
                </div>
            </div>
            {import.meta.env.DEV && isGameActive(game) && (
                <fieldset className="debug-warp-controls" aria-label="デバッグ用の時間スキップ">
                    <small>DEBUG</small>
                    {(
                        [
                            { label: '中盤へ', minutes: 4 },
                            { label: '終盤へ', minutes: 6 },
                        ] as const
                    ).map(({ label, minutes }) => {
                        const targetWeek = Math.ceil((minutes * 60_000) / WEEK_MS);
                        return (
                            <button
                                type="button"
                                key={minutes}
                                title={`${label}の検証状態へ切り替えます。スキル開発・普及・研究も進んだ状態になります。`}
                                onClick={() => {
                                    elapsed.current = 0;
                                    setFraction(0);
                                    usePresentationClock.setState({ fraction: 0 });
                                    useGameStore.getState().debugWarp(targetWeek);
                                }}
                            >
                                {label}
                                <small>{minutes}分</small>
                            </button>
                        );
                    })}
                </fieldset>
            )}
        </section>
    );
}
