import { AREAS, WEEK_MS } from './data.ts';
import { instituteArea, instituteFor } from './research/locations.ts';
import type { GameState } from './types.ts';

export const MAP_LOCATION_COOLDOWN_WEEKS = Math.ceil(30_000 / WEEK_MS);

/** 種類を問わず同じ地域と近接地点を避け、消えてから標準速度で30秒空ける。 */
export function canPlaceMapIncident(
    game: GameState,
    area: number,
    location: { longitude: number; latitude: number },
) {
    const overlaps = (otherArea: number, other: { longitude: number; latitude: number }) => {
        const longitude = Math.abs(location.longitude - other.longitude);
        return (
            area === otherArea ||
            Math.hypot(Math.min(longitude, 360 - longitude), location.latitude - other.latitude) <
                10
        );
    };
    if (
        game.researchProjects.some(
            (project) =>
                overlaps(instituteArea(project.instituteId), instituteFor(project)) &&
                (project.status === 'active' ||
                    game.week < project.publishedWeek! + MAP_LOCATION_COOLDOWN_WEEKS),
        )
    )
        return false;
    return !game.encounters.some(
        (encounter) =>
            overlaps(encounter.area, AREAS[encounter.area]) &&
            game.week <
                (encounter.status === 'resolved' ? encounter.resolvedWeek! : encounter.deadline) +
                    MAP_LOCATION_COOLDOWN_WEEKS,
    );
}
