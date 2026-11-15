import type { EncounterState } from '../../game/society/types';
import { ContinuousProgress, useProjectedGame } from '../ContinuousProgress';
export function EncounterProgress({
    encounter,
    week,
}: {
    encounter: EncounterState;
    week: number;
}) {
    const next = useProjectedGame();
    return (
        <ContinuousProgress
            label="対応期限までの残り時間"
            className="map-research-progress"
            value={Math.max(0, encounter.deadline - week)}
            nextValue={Math.max(0, encounter.deadline - next.week)}
            max={encounter.deadline - encounter.startedWeek}
        />
    );
}
