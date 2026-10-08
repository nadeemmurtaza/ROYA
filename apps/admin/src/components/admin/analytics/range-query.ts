/** How a report's endpoint wants its period: `days` (most of them) or an explicit `from`/`to` (the finance expense reports). */
export type RangeAs = 'days' | 'dates';

const DAY_MS = 86_400_000;

/**
 * The period part of a report request. The range picker thinks in "last N days";
 * an endpoint that validates `from`/`to` and refuses unknown parameters answers
 * 400 to `days`, so those reports ask for dates instead.
 */
export function rangeQuery(rangeAs: RangeAs | undefined, days: number, now: Date = new Date()): Record<string, string | number> {
  if (rangeAs !== 'dates') return { days };
  return { from: new Date(now.getTime() - days * DAY_MS).toISOString(), to: now.toISOString() };
}
