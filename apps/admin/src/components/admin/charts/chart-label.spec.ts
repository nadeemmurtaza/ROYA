import { dayLabel } from './chart-label';

describe('dayLabel', () => {
  it('gives an idle tooltip no heading instead of throwing on an empty date', () => {
    expect(dayLabel(false, undefined)).toBeUndefined();
    expect(dayLabel(true, undefined)).toBeUndefined();
    expect(dayLabel(true, '')).toBeUndefined();
  });

  it('names the day of a hovered point, weekday first', () => {
    expect(dayLabel(true, '2026-10-05')).toMatch(/^Mon/);
  });
});
