import { describe, expect, it } from 'vitest';
import type { Commission, CommissionAppointment } from '@/types/api';
import {
  COMMISSION_STAGES,
  latestEvent,
  nextStage,
  openCommissions,
  previousStage,
  stageState,
  toInstant,
  upcomingAppointments,
} from './commission-model';

describe('stageState', () => {
  it('marks the stages behind as done, the current one as now, the rest as next', () => {
    expect(COMMISSION_STAGES.map((stage) => stageState(stage, 'CORSET'))).toEqual([
      'done',
      'done',
      'now',
      'next',
      'next',
    ]);
  });

  it('closes the last stage once the commission is finished', () => {
    expect(stageState('FITTING', 'FITTING')).toBe('now');
    expect(stageState('FITTING', 'FITTING', true)).toBe('done');
  });
});

describe('neighbouring stages', () => {
  it('has no stage before the first or after the last', () => {
    expect(previousStage('CONSULTATION')).toBeNull();
    expect(nextStage('FITTING')).toBeNull();
    expect(nextStage('CONSULTATION')).toBe('DESIGN');
    expect(previousStage('FLORALS')).toBe('CORSET');
  });
});

describe('latestEvent', () => {
  it('returns the newest event of the stage, and null when the stage has none', () => {
    const events = [
      { stage: 'CORSET' as const, createdAt: '2026-10-02T00:00:00Z', id: 'a' },
      { stage: 'CORSET' as const, createdAt: '2026-10-09T00:00:00Z', id: 'b' },
      { stage: 'DESIGN' as const, createdAt: '2026-10-05T00:00:00Z', id: 'c' },
    ];
    expect(latestEvent(events, 'CORSET')?.id).toBe('b');
    expect(latestEvent(events, 'FLORALS')).toBeNull();
  });
});

describe('upcomingAppointments', () => {
  const now = new Date('2026-10-19T12:00:00Z');
  const make = (id: string, startsAt: string, status: CommissionAppointment['status']): CommissionAppointment => ({
    id,
    kind: 'ATELIER',
    startsAt,
    status,
    note: null,
  });

  it('keeps asked-for and confirmed fittings that are still ahead, soonest first', () => {
    const list = [
      make('late', '2026-11-20T10:00:00Z', 'CONFIRMED'),
      make('past', '2026-10-01T10:00:00Z', 'CONFIRMED'),
      make('done', '2026-10-25T10:00:00Z', 'DONE'),
      make('cancelled', '2026-10-26T10:00:00Z', 'CANCELLED'),
      make('soon', '2026-10-30T10:00:00Z', 'REQUESTED'),
    ];
    expect(upcomingAppointments(list, now).map((appointment) => appointment.id)).toEqual(['soon', 'late']);
  });
});

describe('openCommissions', () => {
  it('drops the finished ones', () => {
    const open = { id: 'a', completedAt: null } as Commission;
    const done = { id: 'b', completedAt: '2026-10-10T00:00:00Z' } as Commission;
    expect(openCommissions([open, done])).toEqual([open]);
  });
});

describe('toInstant', () => {
  it('turns a local date-time into an ISO instant, and nothing into null', () => {
    expect(toInstant('2026-11-03T16:30')).toBe(new Date('2026-11-03T16:30').toISOString());
    expect(toInstant('')).toBeNull();
    expect(toInstant('not a date')).toBeNull();
  });
});
