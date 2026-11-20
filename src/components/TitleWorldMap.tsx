import { useEffect, useRef, useState } from 'react';
import { AREAS } from '../game/data';
import { mapScene } from '../map/config';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../map/geometry';
import { WorldRenderer } from '../map/rendering/WorldRenderer';
import type { MapRegion } from '../map/types';

const unusedAreas = AREAS.map(() => ({
    autonomous: 0,
    dependent: 0,
    antiAI: 0,
    favorability: 0.58,
}));

/** 普及・依存のない地図を、操作しないタイトル背景として描く。 */
export function TitleWorldMap({ regions }: { regions: MapRegion[] }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const element = canvas.current!;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const renderer = new WorldRenderer(element, {
            ready: () => {
                element.dataset.ready = 'true';
            },
            error: (reason) => setError(reason instanceof Error ? reason.message : String(reason)),
            targets: () => {},
            presented: () => {},
        });
        renderer.setData({
            regions,
            areaStates: unusedAreas,
            serverArea: -1,
            selectedArea: null,
            speed: reducedMotion ? 0 : 1,
            tick: 0,
        });
        const resize = () => {
            const { width, height } = element.getBoundingClientRect();
            const zoom = Math.max(1, (width * WORLD_HEIGHT) / (height * WORLD_WIDTH));
            const period = (height * zoom * WORLD_WIDTH) / WORLD_HEIGHT;
            renderer.setView({ width, height, zoom, x: (width - period) / 2, y: 0 });
        };
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        resize();
        renderer.setScene({ ...mapScene, regions });

        return () => {
            observer.disconnect();
            renderer.dispose();
        };
    }, [regions]);

    return (
        <>
            <canvas className="start-map" ref={canvas} tabIndex={-1} aria-hidden="true" />
            {error && (
                <p className="start-map-error" role="alert">
                    {error}
                </p>
            )}
        </>
    );
}
