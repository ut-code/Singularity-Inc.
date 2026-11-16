import { useLayoutEffect, useRef, useState } from 'react';
/** 表示枠に全体を収める。ユーザー操作によるスクロールやズームは行わない。 */
export function useSkillTreeViewport(canvasWidth: number, canvasHeight: number) {
    const viewport = useRef<HTMLElement>(null);
    const [size, setSize] = useState({ width: 1, height: 1 });
    useLayoutEffect(() => {
        const element = viewport.current!;
        const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return {
        viewport,
        size,
        zoom: Math.min(size.width / canvasWidth, size.height / canvasHeight),
        canvasWidth,
        canvasHeight,
        renderedWidth: size.width,
        renderedHeight: size.height,
    };
}
