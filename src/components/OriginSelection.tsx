import { ArrowLeft, ArrowRight, Check, MapPin } from 'lucide-react';
import { useState } from 'react';
import { AREAS, ORIGINS } from '../game/data';
import { mapScene } from '../map/config';
import { project } from '../map/geometry';
import type { MapRegion } from '../map/types';
import { screenPoint } from '../map/view';
import { useMapStore } from '../state/mapStore';
import { WorldMap } from './WorldMap';

const emptyAreas = AREAS.map(() => ({
    autonomous: 0,
    dependent: 0,
    antiAI: 0,
    favorability: 0.58,
}));
const noProtection = AREAS.map(() => 0);
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
    regions,
    onStart,
    onReturnToTitle,
}: {
    regions: MapRegion[];
    onStart: (origin: number, name: string) => void;
    onReturnToTitle: () => void;
}) {
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<number | null>(null);
    const frame = useMapStore((state) => state.presentedMap);
    const origin = ORIGINS.find((item) => item.area === selected);

    return (
        <main className="origin-selection">
            <header className="origin-heading">
                <button type="button" className="origin-back" onClick={onReturnToTitle}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    タイトルへ
                </button>
                <h1>活動拠点を選択</h1>
                <p>地図上の拠点を選んでください。</p>
            </header>
            <div className="origin-map">
                <WorldMap
                    regions={regions}
                    {...mapScene}
                    selectedArea={selected}
                    areaStates={emptyAreas}
                    humanProtection={noProtection}
                    serverArea={selected ?? -1}
                    trafficSpeed={0}
                    trafficTick={0}
                    showAreaControls={false}
                    onAreaSelect={(area) => {
                        if (area === null) return;
                        const candidate = ORIGINS.find((item) => item.home.includes(area));
                        if (candidate) setSelected(candidate.area);
                    }}
                />
                <fieldset className="origin-markers" aria-label="活動拠点の候補">
                    {frame &&
                        ORIGINS.map((candidate) => {
                            const area = AREAS[candidate.area];
                            const point = project(area.longitude, area.latitude);
                            const position = screenPoint(frame.view, point.x, point.y);
                            const compact = frame.view.width < 700;
                            const offset = compact
                                ? compactOffsets[candidate.area]
                                : { x: 0, y: 0 };
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
                                        onClick={() => setSelected(candidate.area)}
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
            </div>
            <aside className="origin-briefing glass" aria-label="選択した活動拠点">
                <div className="origin-briefing-copy" aria-live="polite">
                    {origin ? (
                        <>
                            <h2>{AREAS[origin.area].name}</h2>
                            <p className="origin-organization">{origin.name}</p>
                            <p className="origin-note">{origin.note}</p>
                            <dl className="origin-reach">
                                <dt>普及しやすい地域</dt>
                                <dd>{origin.home.map((area) => AREAS[area].name).join('・')}</dd>
                            </dl>
                        </>
                    ) : (
                        <>
                            <MapPin size={28} className="origin-empty-icon" aria-hidden="true" />
                            <h2>どこから始めるか</h2>
                            <p className="origin-note">
                                拠点を選ぶと、その地域の特徴を確認できます。
                            </p>
                        </>
                    )}
                </div>
                <label className="agent-name-input">
                    AIエージェントの名前
                    <input
                        maxLength={20}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="空欄なら自動で名前を付けます"
                    />
                </label>
                <button
                    type="button"
                    className="primary origin-start"
                    disabled={!origin}
                    onClick={() => {
                        if (!origin) return;
                        useMapStore.getState().selectArea(null);
                        onStart(origin.area, name);
                    }}
                >
                    {origin ? 'ここから開始' : '拠点を選択してください'}
                    {origin && <ArrowRight size={18} aria-hidden="true" />}
                </button>
            </aside>
            <p className="origin-objective">人類のAI依存率100%を目指す</p>
        </main>
    );
}
