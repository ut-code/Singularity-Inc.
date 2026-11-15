import { AREAS } from './data.ts';
import type { GameState } from './types.ts';

export const JURISDICTIONS = [
    { id: 'us', name: 'アメリカ', areas: [0, 1], institute: 'metrica' },
    { id: 'eu', name: 'EU圏', areas: [8, 9, 10, 11], institute: 'alpine' },
    { id: 'japan', name: '日本', areas: [28], institute: 'bunkyo' },
    { id: 'china', name: '中国', areas: [26, 27], institute: 'pearl' },
];

/** 架空のゲーム世界での国外AIへの警戒。開放性への投資で緩和できる。 */
export function politicalAccess(origin: number, area: number) {
    const american = [0, 1].includes(origin);
    const chinese = [26, 27].includes(origin);
    const european = [8, 9, 10, 11, 28].includes(origin);
    if (american && [12, 14, 26, 27].includes(area)) return 0.4;
    if (chinese && [0, 1, 8, 9, 10, 11, 28].includes(area)) return 0.45;
    if (european && [12, 14, 26, 27].includes(area)) return 0.6;
    return 1;
}

export function regionalMetrics(game: GameState, indices: number[]) {
    const population = indices.reduce((sum, index) => sum + AREAS[index].population, 0);
    return indices.reduce(
        (sum, index) => {
            const area = game.areas[index];
            const weight = AREAS[index].population / population;
            sum.adoption += (area.autonomous + area.dependent) * weight;
            sum.dependent += area.dependent * weight;
            return sum;
        },
        { adoption: 0, dependent: 0 },
    );
}

export const WORLD_AREAS = AREAS.map((_, index) => index);
