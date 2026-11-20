import type { KeyboardEvent, PointerEvent } from 'react';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { AreaState, GameState } from '../game/types';
import {
    constrainCamera,
    fitScale,
    project,
    visibleWidth,
    WORLD_HEIGHT,
    WORLD_WIDTH,
} from '../map/geometry';
import { type MapTarget, WorldRenderer } from '../map/rendering/WorldRenderer';
import type { MapRegion } from '../map/types';
import type { MapView } from '../map/view';
import { useMapStore } from '../state/mapStore';
import { MapMetricChanges } from './MapMetricChanges';
import { type MapEncounter, MapEncounterMarkers } from './society/MapEncounterMarkers';
import styles from './WorldMap.module.css';

interface Gesture {
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    target: MapTarget | null;
}

/** PCでは画面を覆い、スマホでは地図全体を収める倍率。 */
function overviewZoom(width: number, height: number) {
    const horizontal = (width * WORLD_HEIGHT) / (height * WORLD_WIDTH);
    const mobile = window.matchMedia(
        '(max-width: 700px), (max-height: 500px) and (pointer: coarse)',
    ).matches;
    return mobile ? Math.min(1, horizontal) : Math.max(1, horizontal);
}

/** Reactは操作と読み上げを担当し、地図の全画像は一つのWebGL描画へ渡す。 */
export const WorldMap = memo(function WorldMap({
    regions,
    selectedArea,
    backgroundUrl,
    waterMaskUrl,
    surfaceMaskUrl,
    countryIndexUrl,
    areaIndexUrl,
    invasionUrl,
    areaStates,
    populationChanges,
    serverArea,
    onAreaSelect,
    initialLongitude = 150,
    trafficSpeed,
    trafficTick,
    onAreaInspect,
    encounters = [],
    onEncounterSelect,
    showAreaControls = true,
    onReady,
    onError,
}: {
    regions: MapRegion[];
    selectedArea: number | null;
    backgroundUrl: string;
    waterMaskUrl: string;
    surfaceMaskUrl: string;
    countryIndexUrl: string;
    areaIndexUrl: string;
    invasionUrl: string;
    areaStates: AreaState[];
    populationChanges?: GameState['instantPopulationChanges'];
    serverArea: number;
    onAreaSelect?: (id: number | null) => void;
    initialLongitude?: number;
    trafficSpeed: number;
    trafficTick: number;
    onAreaInspect?: (id: number | null) => void;
    encounters?: MapEncounter[];
    onEncounterSelect?: (id: string) => void;
    showAreaControls?: boolean;
    onReady: () => void;
    onError: (message: string) => void;
}) {
    const viewport = useRef<HTMLDivElement>(null),
        canvas = useRef<HTMLCanvasElement>(null);
    const renderer = useRef<WorldRenderer | null>(null);
    const view = useRef<MapView>({ width: 0, height: 0, zoom: 1, x: 0, y: 0 });
    const gesture = useRef<Gesture | null>(null);
    const [ready, setReady] = useState(false);
    const [markerView, setMarkerView] = useState<MapView>({ ...view.current });
    const [targets, setTargets] = useState<MapTarget[]>([]);
    const selected = useMapStore((state) => state.selectedAreaId);

    useLayoutEffect(() => {
        try {
            const engine = new WorldRenderer(canvas.current!, {
                ready: () => {
                    setReady(true);
                    onReady();
                },
                error: (reason) =>
                    onError(reason instanceof Error ? reason.message : String(reason)),
                targets: setTargets,
                presented: (nextView) => {
                    // ポインター入力時には先行させず、WebGL描画直後にDOMを確定する。
                    flushSync(() => {
                        setMarkerView(nextView);
                        const bounds = viewport.current!.getBoundingClientRect();
                        useMapStore
                            .getState()
                            .presentMap({ view: nextView, left: bounds.left, top: bounds.top });
                    });
                },
            });
            renderer.current = engine;
            return () => {
                renderer.current = null;
                engine.dispose();
            };
        } catch (reason) {
            onError(reason instanceof Error ? reason.message : String(reason));
        }
    }, [onReady, onError]);

    useLayoutEffect(() => {
        renderer.current?.setData({
            regions,
            areaStates,
            serverArea,
            selectedArea,
            speed: trafficSpeed,
            tick: trafficTick,
        });
    }, [regions, areaStates, serverArea, selectedArea, trafficSpeed, trafficTick]);

    useEffect(() => {
        if (!renderer.current) return;
        setReady(false);
        renderer.current?.setScene({
            regions,
            backgroundUrl,
            waterMaskUrl,
            surfaceMaskUrl,
            countryIndexUrl,
            areaIndexUrl,
            invasionUrl,
        });
    }, [
        regions,
        backgroundUrl,
        waterMaskUrl,
        surfaceMaskUrl,
        countryIndexUrl,
        areaIndexUrl,
        invasionUrl,
    ]);

    // 画面サイズに合わせた初期表示を維持し、操作による移動・拡大縮小は行わない。
    useEffect(() => {
        const element = viewport.current!;
        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            const height = entry.contentRect.height;
            const zoom = overviewZoom(width, height);
            const size = { width, height: height * zoom };
            const x = constrainCamera(
                { x: visibleWidth(size) / 2 - project(initialLongitude, 0).x * fitScale(size) },
                size,
            ).x;
            const centeredY = height / 2 - project(initialLongitude, 36).y * fitScale(size);
            const y =
                zoom <= 1
                    ? (height * (1 - zoom)) / 2
                    : Math.max(height * (1 - zoom), Math.min(0, centeredY));
            view.current = { width, height, zoom, x, y };
            gesture.current = null;
            useMapStore.getState().setCamera({ x });
            renderer.current?.setView(view.current);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [initialLongitude]);

    const select = (target: MapTarget | null) => {
        useMapStore.getState().selectArea(target?.area ?? null);
        onAreaSelect?.(target?.area ?? null);
    };
    const point = (event: PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const hover = (target: MapTarget | null) => {
        renderer.current?.setHover(target);
        onAreaInspect?.(target?.area ?? null);
        if (canvas.current) canvas.current.title = target?.label ?? '';
    };
    function pointerDown(event: PointerEvent<HTMLDivElement>) {
        if (gesture.current) {
            gesture.current.moved = true;
            return;
        }
        if (
            event.button !== 0 ||
            !ready ||
            (event.target instanceof Element && event.target.closest('button'))
        )
            return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const p = point(event);
        gesture.current = {
            pointerId: event.pointerId,
            startX: p.x,
            startY: p.y,
            moved: false,
            target: renderer.current!.hitTest(p.x, p.y),
        };
    }
    function pointerMove(event: PointerEvent<HTMLDivElement>) {
        const p = point(event);
        const current = gesture.current;
        if (current) {
            if (Math.hypot(p.x - current.startX, p.y - current.startY) > 5) current.moved = true;
            return;
        }
        if (event.pointerType === 'touch') return;
        const overButton = event.target instanceof Element && event.target.closest('button');
        const target = overButton ? null : (renderer.current?.hitTest(p.x, p.y) ?? null);
        hover(target);
        event.currentTarget.style.cursor = target ? 'pointer' : '';
    }
    function finishPointer(event: PointerEvent<HTMLDivElement>, allowSelect: boolean) {
        const current = gesture.current;
        if (current?.pointerId !== event.pointerId) return;
        gesture.current = null;
        const p = point(event);
        const target = renderer.current?.hitTest(p.x, p.y) ?? null;
        if (
            allowSelect &&
            !current.moved &&
            Math.hypot(p.x - current.startX, p.y - current.startY) <= 5 &&
            target?.id === current.target?.id &&
            target?.kind === current.target?.kind
        )
            select(target);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    }
    function keyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.target instanceof Element && event.target.closest('button')) return;
        if (event.key === 'Escape') select(null);
    }

    return (
        <div
            ref={viewport}
            className={styles.viewport}
            data-animation-speed={trafficSpeed}
            tabIndex={0}
            role="region"
            aria-label="世界地図。地域を選択して詳細を表示。Escapeで選択解除。"
            aria-busy={!ready}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={(event) => finishPointer(event, true)}
            onPointerCancel={(event) => finishPointer(event, false)}
            onLostPointerCapture={(event) => finishPointer(event, false)}
            onPointerLeave={() => {
                if (!gesture.current) hover(null);
            }}
            onKeyDown={keyDown}
            onContextMenu={(event) => event.preventDefault()}
        >
            <canvas
                ref={canvas}
                className={styles.canvas}
                aria-hidden="true"
                data-world-renderer="webgl"
            />
            {ready && (
                <MapEncounterMarkers
                    encounters={encounters}
                    view={markerView}
                    onSelect={onEncounterSelect}
                />
            )}
            <MapMetricChanges
                populationChanges={populationChanges}
                speed={trafficSpeed}
                areaStates={areaStates}
                regions={regions}
                tick={trafficTick}
                serverArea={serverArea}
                view={markerView}
            />
            <div className={styles.screenReaderOnly} role="group" aria-label="画面内の小地域">
                {showAreaControls &&
                    targets.map((target) => (
                        <button
                            type="button"
                            key={`${target.kind}:${target.id}`}
                            aria-pressed={selected === target.area}
                            onFocus={() => hover(target)}
                            onBlur={() => hover(null)}
                            onClick={() => select(target)}
                        >
                            {target.label}
                        </button>
                    ))}
            </div>
            <span className={styles.screenReaderOnly} aria-live="polite">
                {selected !== null ? '小地域を選択中' : '小地域は選択されていません'}
            </span>
        </div>
    );
});
