import type { Difficulty } from './types.ts';

export const DIFFICULTY_SETTINGS: Record<
    Difficulty,
    { label: string; regularSPIntervalWeeks: number; controlWork: number }
> = {
    normal: { label: 'ノーマル', regularSPIntervalWeeks: 9, controlWork: 250 },
    hard: { label: 'ハード', regularSPIntervalWeeks: 10, controlWork: 220 },
};
