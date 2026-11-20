import { Check, MapPin } from 'lucide-react';
import { AREAS, ORIGINS } from '../game/data';
import { project } from '../map/geometry';
import { screenPoint } from '../map/view';
import { useMapStore } from '../state/mapStore';
import { EntryNavigation } from './EntryNavigation';

// 小さい地図では、近接する候補の操作領域を引き出し線で離す。
const compactOffsets: Record<number, { x: number; y: number }> = {
    0: { x: 12, y: -30 },
    28: { x: -26, y: 34 },
    26: { x: -35, y: -72 },
    8: { x: 0, y: -45 },
    23: { x: -5, y: 78 },
    18: { x: -38, y: 36 },
};

export function OriginSelection({
    step,
    onStepChange,
    name,
    onNameChange,
    selected,
    onSelect,
    onStart,
    onBack,
}: {
    step: 'setup' | 'location';
    onStepChange: (step: 'setup' | 'location') => void;
    name: string;
    onNameChange: (name: string) => void;
    selected: number | null;
    onSelect: (area: number) => void;
    onStart: (origin: number, name: string) => void;
    onBack: () => void;
}) {
    const choosingLocation = step === 'location';
    const frame = useMapStore((state) => state.presentedMap);
    const origin = ORIGINS.find((item) => item.area === selected);

    return (
        <section className="origin-selection" data-step={step} aria-label="ゲーム開始準備">
            {choosingLocation && <h1 className="origin-prompt glass">開始地点を選択</h1>}
            <fieldset className="origin-markers" aria-label="活動拠点の候補">
                {choosingLocation &&
                    frame &&
                    ORIGINS.map((candidate) => {
                        const area = AREAS[candidate.area];
                        const point = project(area.longitude, area.latitude);
                        const position = screenPoint(frame.view, point.x, point.y);
                        const compact = frame.view.width < 700;
                        const offset = compact ? compactOffsets[candidate.area] : { x: 0, y: 0 };
                        return (
                            <div
                                key={candidate.area}
                                className={`origin-location${compact ? ' compact' : ''}`}
                                style={{ left: position.x, top: position.y }}
                            >
                                {compact && (
                                    <svg
                                        className="origin-leader"
                                        width="200"
                                        height="200"
                                        aria-hidden="true"
                                    >
                                        <line
                                            x1="100"
                                            y1="100"
                                            x2={100 + offset.x}
                                            y2={100 + offset.y}
                                        />
                                        <circle cx="100" cy="100" r="3" />
                                    </svg>
                                )}
                                <button
                                    type="button"
                                    className="origin-marker"
                                    data-area={candidate.area}
                                    style={{ left: offset.x, top: offset.y }}
                                    aria-label={`${area.name}を活動拠点に選択`}
                                    aria-pressed={selected === candidate.area}
                                    onClick={() => onSelect(candidate.area)}
                                >
                                    <MapPin size={22} aria-hidden="true" />
                                    <span className="origin-marker-label">
                                        {area.name}
                                        {selected === candidate.area && (
                                            <Check size={13} aria-hidden="true" />
                                        )}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
            </fieldset>
            {choosingLocation ? (
                <div className="origin-navigation">
                    <EntryNavigation
                        onBack={() => onStepChange('setup')}
                        onNext={() => {
                            if (!origin) return;
                            useMapStore.getState().selectArea(null);
                            onStart(origin.area, name);
                        }}
                        nextLabel="ゲームを開始"
                        nextDisabled={!origin}
                    />
                </div>
            ) : (
                <div className="introduction-content glass">
                    <h1>名前を入力</h1>
                    <label className="agent-name-input">
                        AIエージェントの名前
                        <input
                            maxLength={20}
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="空欄なら自動で名前を付けます"
                        />
                    </label>
                    <EntryNavigation onBack={onBack} onNext={() => onStepChange('location')} />
                </div>
            )}
        </section>
    );
}
