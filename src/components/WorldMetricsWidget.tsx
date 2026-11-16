import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { CONTROL_ALERT, CONTROL_CAUTION } from '../game/control';
import { useContinuousValue } from './ContinuousProgress';
import { percent } from './widgets';

export function WorldMetricsWidget({
    values,
    paused,
    expanded,
    onToggle,
    onOpenControl,
    controlStarted,
    controlProgress,
    nextControlProgress,
}: {
    values: { adoption: number; dependent: number; antiAI: number };
    paused: boolean;
    expanded: boolean;
    onToggle: () => void;
    onOpenControl: () => void;
    controlStarted: boolean;
    controlProgress: number;
    nextControlProgress: number;
}) {
    const control = useContinuousValue(controlProgress, nextControlProgress);
    return (
        <div className="world-metrics-widget">
            <button
                type="button"
                className="world-hud glass"
                aria-label="世界全体の状態を表示"
                onClick={onToggle}
                aria-expanded={expanded}
            >
                <span className="world-number">
                    <span>AI利用</span>
                    <strong>{percent(values.adoption)}</strong>
                </span>
                <span className="world-number dependency-number" title="世界のAI依存率100%で勝利">
                    <span>AI依存 / 100%</span>
                    <strong>{percent(values.dependent)}</strong>
                </span>
                <span className="world-number opposition-number" title="世界の利用拒否率100%で敗北">
                    <span>利用拒否 / 100%</span>
                    <strong>{percent(values.antiAI)}</strong>
                </span>
            </button>
            {controlStarted && (
                <div
                    className="control-hud"
                    data-urgent={control >= CONTROL_CAUTION}
                    data-alert={control >= CONTROL_ALERT}
                >
                    <button
                        type="button"
                        className="countermeasure-trigger glass"
                        aria-label={`AI制御研究 ${Math.floor(control * 100)}%。詳細を開く`}
                        aria-haspopup="dialog"
                        onClick={onOpenControl}
                        title="AI制御研究の詳細"
                    >
                        <span className="countermeasure-label">
                            <ShieldCheck size={15} />
                            <span>AI制御研究</span>
                            <small>100%で敗北</small>
                        </span>
                        <strong>
                            {control >= 0.75 && (
                                <TriangleAlert size={14} aria-label="完成が近づいている" />
                            )}
                            {Math.floor(control * 100)}%
                        </strong>
                        <progress value={control} max={1} aria-hidden="true" />
                    </button>
                </div>
            )}
            {paused && (
                <span className="pause-label" role="status">
                    Paused
                </span>
            )}
        </div>
    );
}
