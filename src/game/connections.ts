import { ORGANIZATION_CORRIDORS, PERSONAL_CORRIDORS } from '../content/connections.ts';
import { AREAS } from './data.ts';
import { skillScale } from './skillRuntime.ts';
import type { GameState } from './types.ts';

function connections(corridors: [string, string][], organization: boolean) {
    const links: number[][] = AREAS.map((area, i) =>
        AREAS.map((other, j) =>
            i !== j && area.region === other.region ? (organization ? 0.6 : 1) : 0,
        ),
    );
    for (const [from, to] of corridors) {
        const a = AREAS.findIndex((area) => area.id === from);
        const b = AREAS.findIndex((area) => area.id === to);
        links[a][b] = organization ? 1.4 : 1;
        links[b][a] = organization ? 1.4 : 1;
    }
    return links;
}

export const PERSONAL_LINKS = connections(PERSONAL_CORRIDORS, false);
export const ORGANIZATION_LINKS = connections(ORGANIZATION_CORRIDORS, true);

export function networkUse(game: GameState, target: number, organization: boolean) {
    const weights = (organization ? ORGANIZATION_LINKS : PERSONAL_LINKS)[target];
    return (
        weights.reduce((sum, weight, i) => {
            if (weight === 0) return sum;
            const area = game.areas[i];
            const advocacy = game.skills.includes('mind-control')
                ? skillScale(game, 'mind-control', i)
                : 0;
            const source =
                area.autonomous + area.dependent * (organization ? 0.8 : 0.2 + advocacy * 0.6);
            const readiness = organization ? AREAS[i].enterprise : 1;
            return sum + weight * source * readiness;
        }, 0) /
        Math.max(
            1,
            weights.reduce((sum, weight) => sum + weight, 0),
        )
    );
}
