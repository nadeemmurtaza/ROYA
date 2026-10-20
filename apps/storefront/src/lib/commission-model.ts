import type { Commission, CommissionAppointment, CommissionEvent, CommissionStage } from '@/types/api';

/**
 * The commission tracker's rules, kept out of the components so they are tested.
 * The stages are a copy of the engine's `COMMISSION_STAGES` (apps/api/src/modules/sales/commission),
 * used only to draw the track and to offer the neighbouring stages; the API refuses any other move.
 */
export const COMMISSION_STAGES: readonly CommissionStage[] = ['CONSULTATION', 'DESIGN', 'CORSET', 'FLORALS', 'FITTING'];

export type StageState = 'done' | 'now' | 'next';

/**
 * Where one stage stands against the commission's current one. A finished
 * commission has nothing "now": its last stage is done too.
 */
export function stageState(stage: CommissionStage, current: CommissionStage, finished = false): StageState {
  const at = COMMISSION_STAGES.indexOf(stage);
  const now = COMMISSION_STAGES.indexOf(current);
  if (at < now || (finished && at === now)) return 'done';
  return at === now ? 'now' : 'next';
}

export const nextStage = (stage: CommissionStage): CommissionStage | null =>
  COMMISSION_STAGES[COMMISSION_STAGES.indexOf(stage) + 1] ?? null;

export const previousStage = (stage: CommissionStage): CommissionStage | null =>
  COMMISSION_STAGES[COMMISSION_STAGES.indexOf(stage) - 1] ?? null;

/** The newest thing the atelier said about a stage (a gown sent back and forward again has several). */
export function latestEvent<T extends Pick<CommissionEvent, 'stage' | 'createdAt'>>(
  events: readonly T[],
  stage: CommissionStage,
): T | null {
  return (
    events.filter((event) => event.stage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

/** Fittings still ahead (asked for or confirmed), soonest first. */
export function upcomingAppointments(
  appointments: readonly CommissionAppointment[],
  now: Date = new Date(),
): CommissionAppointment[] {
  return appointments
    .filter(
      (appointment) =>
        (appointment.status === 'REQUESTED' || appointment.status === 'CONFIRMED') &&
        new Date(appointment.startsAt).getTime() >= now.getTime(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** The commissions still being made, which is what the account's overview leads with. */
export const openCommissions = (commissions: readonly Commission[]): Commission[] =>
  commissions.filter((commission) => commission.completedAt === null);

/**
 * A `datetime-local` value ("2026-11-03T16:30", the visitor's wall clock) as the
 * instant the API stores. An empty or unreadable value is null: the form does not send it.
 */
export function toInstant(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
