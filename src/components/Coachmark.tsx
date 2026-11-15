import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
export interface CoachmarkPoint {
    x: number;
    y: number;
    height: number;
}
/** 対象の上側に配置する、操作を遮らない説明用吹き出し。 */
export function Coachmark({
    point,
    text,
    tailSide,
    speed,
    onExpire,
}: {
    point: CoachmarkPoint;
    text: string;
    tailSide: 'left' | 'right';
    speed: number;
    onExpire: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null),
        elapsed = useRef(0);
    const [{ width, height }, setSize] = useState({ width: 330, height: 100 });
    useLayoutEffect(() => {
        const element = ref.current!;
        const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (speed === 0) return;
        let frame: number,
            previous = performance.now();
        const tick = (now: number) => {
            elapsed.current += Math.min(250, now - previous) * speed;
            previous = now;
            if (elapsed.current >= 6000) onExpire();
            else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [speed, onExpire]);
    const left = Math.max(
        16,
        Math.min(window.innerWidth - width - 16, point.x - (tailSide === 'left' ? 44 : width - 44)),
    );
    const tailHeight = 20;
    // 要素の外周から余白を取り、足がアイコンやボタンに重ならないようにする。
    const targetOffset = point.height > 0 ? point.height / 2 + 6 : 0;
    const above = point.y - targetOffset - height - tailHeight;
    const tailEdge = above >= 12 ? 'bottom' : 'top';
    const top = tailEdge === 'top' ? point.y + targetOffset + tailHeight : above;
    const tailLeft = Math.max(
        8,
        Math.min(width - 22, point.x - left - (tailSide === 'right' ? 14 : 0)),
    );
    return (
        <div
            ref={ref}
            className="coachmark"
            role="status"
            data-animation-clock="manual"
            style={{
                left,
                top: Math.max(12, Math.min(window.innerHeight - height - 12, top)),
            }}
        >
            <p>{text}</p>
            <button
                type="button"
                className="coachmark-close"
                aria-label="吹き出しを閉じる"
                onClick={onExpire}
            >
                <X size={12} aria-hidden="true" />
            </button>
            <svg
                className="coachmark-tail"
                width="14"
                height="21"
                viewBox="0 0 14 21"
                aria-hidden="true"
                style={{
                    left: tailLeft,
                    [tailEdge === 'top' ? 'top' : 'bottom']: -tailHeight,
                    transform: `scale(${tailSide === 'left' ? -1 : 1},${tailEdge === 'top' ? -1 : 1})`,
                }}
            >
                <path d="M0 0h8L14 20Z" />
                <path d="M0 0 14 20 8 0" className="coachmark-tail-edge" />
            </svg>
        </div>
    );
}
