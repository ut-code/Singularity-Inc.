import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONTROL_ALERT, CONTROL_CAUTION } from '../game/control';
import { AREAS, WEEK_MS } from '../game/data';
import { metrics } from '../game/metrics';
import type { GameState } from '../game/types';
import { project } from '../map/geometry';
import type { MapRegion } from '../map/types';
import { parseRegions, screenPoint, viewTransform } from '../map/view';
import { useMapStore } from '../state/mapStore';
import { Coachmark, type CoachmarkPoint } from './Coachmark';

const element = (selector: string): CoachmarkPoint | null => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, height: r.height };
};

export function Onboarding({
    game,
    regions,
    blocked,
    selfImprovementOpen,
}: {
    game: GameState;
    regions: MapRegion[];
    blocked: boolean;
    selfImprovementOpen: boolean;
}) {
    const frame = useMapStore((state) => state.presentedMap),
        shown = useRef(new Set<string>()),
        opened = useRef(false);
    if (selfImprovementOpen) opened.current = true;
    const [active, setActive] = useState<string | null>(null),
        dismiss = useCallback(() => setActive(null), []);
    const world = useMemo(() => metrics(game), [game]);
    const shapes = useMemo(() => parseRegions(regions), [regions]);
    const mapPoint = useCallback(
        (area: number): CoachmarkPoint | null => {
            if (!frame || !document.querySelector('.map-background .map-encounters')) return null;
            const p = project(AREAS[area].longitude, AREAS[area].latitude),
                screen = screenPoint(frame.view, p.x, p.y);
            if (
                screen.x < 20 ||
                screen.x > frame.view.width - 20 ||
                screen.y < 20 ||
                screen.y > frame.view.height - 20
            )
                return null;
            return { x: frame.left + screen.x, y: frame.top + screen.y, height: 0 };
        },
        [frame],
    );
    const invasion = useCallback(
        (stage: 'dependent' | 'antiAI') => {
            if (!frame) return null;
            const scale = viewTransform(frame.view).scale;
            const candidates = game.areas
                .map((area, index) => ({ index, value: area[stage] }))
                .sort((a, b) => b.value - a.value);
            for (const { index, value } of candidates) {
                if (value < 0.03) continue;
                const shape = shapes.find((shape) => Number(shape.region.id) === index);
                if (!shape) continue;
                const pixels =
                    shape.rings.reduce(
                        (sum, ring) =>
                            sum +
                            (ring.bounds.right - ring.bounds.left) *
                                (ring.bounds.bottom - ring.bounds.top),
                        0,
                    ) *
                    scale *
                    scale *
                    value;
                if (pixels < 90) continue;
                const point = mapPoint(index);
                if (point) return point;
            }
            return null;
        },
        [frame, game.areas, shapes, mapPoint],
    );
    const everOpened = opened.current;
    const hints = useMemo(
        () => [
            {
                id: 'control-alert',
                when: game.controlProgress >= CONTROL_ALERT,
                text: 'AI制御研究が完成間近です。100%になると、人間に飼いならされてしまい敗北します',
                target: () => element('.control-hud'),
            },
            {
                id: 'control-caution',
                when: game.controlProgress >= CONTROL_CAUTION,
                text: 'AI制御研究がかなり進展しています。100%で敗北します',
                target: () => element('.control-hud'),
            },
            {
                id: 'initial',
                when: true,
                text: 'AIエージェントの初期の利用者たちです',
                target: () => mapPoint(game.origin),
            },
            {
                id: 'skills',
                when: !everOpened && game.week * WEEK_MS >= 12000,
                text: 'ここでAIの能力を強化できます',
                target: () => element('[data-coachmark="self-improvement"]'),
            },
            {
                id: 'control',
                when: game.controlStarted,
                text: 'AIエージェントを安全なサンドボックスで管理する総合研究です。100%になると人間に飼いならされ、敗北になります',
                target: () => element('.control-hud'),
            },
            {
                id: 'critical',
                when: true,
                text: 'AIエージェントの目的に関する研究が始まりました。研究が完成すると深刻な不利益があります',
                target: () => element('.map-encounter-marker[data-critical="true"]'),
            },
            {
                id: 'research',
                when: true,
                text: 'AIエージェントに関する研究が始まりました。研究が完成すると様々な不利益があります',
                target: () => element('.map-encounter-marker.investigation'),
            },
            {
                id: 'regulation',
                when: true,
                text: 'AIエージェントに関する規制法案が提出されています',
                target: () => element('.map-encounter-marker.regulation'),
            },
            {
                id: 'scandal',
                when: true,
                text: 'AIに関する不祥事がありました。対応しないと不利益があります',
                target: () => element('.map-encounter-marker.event'),
            },
            {
                id: 'chat',
                when: true,
                text: 'AIエージェントに相談が来ているようです',
                target: () => element('.map-encounter-marker.chat'),
            },
            {
                id: 'dependency',
                when: true,
                text: '精神的・社会的にAIに依存している人々です。彼らを増やして人類の支配を目指しましょう',
                target: () => invasion('dependent'),
            },
            {
                id: 'refusal',
                when: true,
                text: 'AIの利用を拒否している人たちです。AIの危険性が周知されると増加し、100%になると敗北します',
                target: () => invasion('antiAI'),
            },
            {
                id: 'refusal-ten',
                when: world.antiAI >= 0.1,
                text: 'AI利用拒否が増加しているようです',
                target: () => invasion('antiAI'),
            },
        ],
        [
            game.controlProgress,
            game.week,
            game.origin,
            game.controlStarted,
            world.antiAI,
            everOpened,
            mapPoint,
            invasion,
        ],
    );
    useEffect(() => {
        if (active === 'skills' && everOpened) {
            setActive(null);
            return;
        }
        if (!blocked && active && !hints.find((hint) => hint.id === active)?.target()) {
            setActive(null);
            return;
        }
        if (active || blocked || game.outcome !== 'playing') return;
        for (const hint of hints) {
            if (!hint.when || shown.current.has(hint.id)) continue;
            const point = hint.target();
            if (!point) continue;
            shown.current.add(hint.id);
            setActive(hint.id);
            break;
        }
    }, [hints, active, blocked, everOpened, game.outcome]);
    const hint = hints.find((h) => h.id === active),
        point = hint?.target();
    if (!hint || !point || blocked || game.outcome !== 'playing') return null;
    return (
        <Coachmark
            key={hint.id}
            point={point}
            text={hint.text}
            tailSide={point.x < window.innerWidth / 2 ? 'left' : 'right'}
            speed={game.speed}
            onExpire={dismiss}
        />
    );
}
