import { START_DAY, START_MONTH, START_YEAR } from './data.ts';

export const DAYS_PER_WEEK = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const START_DATE = Date.UTC(START_YEAR, START_MONTH - 1, START_DAY);

/** 週内の端数も実際の日数へ換算し、月末・年末・うるう年を暦に従って進める。 */
export function calendarParts(week: number, fraction: number) {
    const days = (week + Math.max(0, Math.min(1, fraction))) * DAYS_PER_WEEK;
    const date = new Date(START_DATE + days * DAY_MS);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
