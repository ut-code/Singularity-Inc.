import type { SkillPositions } from './skillLayout.ts';

/** 開発ツールから渡された全ノードの座標を検証する。 */
export function parseSkillPositions(value: unknown, ids: readonly string[]): SkillPositions | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (Object.keys(value).length !== ids.length) return null;
    const entries: [string, { x: number; y: number }][] = [];
    for (const id of ids) {
        if (!Object.hasOwn(value, id)) return null;
        const point: unknown = (value as Record<string, unknown>)[id];
        if (!point || typeof point !== 'object' || Array.isArray(point)) return null;
        const { x, y } = point as { x?: unknown; y?: unknown };
        if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        )
            return null;
        entries.push([id, { x, y }]);
    }
    return Object.fromEntries(entries);
}
