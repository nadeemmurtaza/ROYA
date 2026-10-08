import { rangeQuery } from './range-query';

const NOW = new Date('2026-10-08T12:00:00.000Z');

describe('rangeQuery', () => {
  it('asks for the last N days by default', () => {
    expect(rangeQuery(undefined, 30, NOW)).toEqual({ days: 30 });
    expect(rangeQuery('days', 7, NOW)).toEqual({ days: 7 });
  });

  it('asks for explicit dates where the endpoint refuses `days`', () => {
    expect(rangeQuery('dates', 30, NOW)).toEqual({
      from: '2026-09-08T12:00:00.000Z',
      to: '2026-10-08T12:00:00.000Z',
    });
  });

  it('never sends both forms', () => {
    expect(Object.keys(rangeQuery('dates', 90, NOW))).toEqual(['from', 'to']);
    expect(Object.keys(rangeQuery('days', 90, NOW))).toEqual(['days']);
  });
});
