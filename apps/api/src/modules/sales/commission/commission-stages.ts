import type { CommissionStage } from '../../../core/prisma/client';

/** The atelier's route from first conversation to the final fitting, in order. */
export const COMMISSION_STAGES: readonly CommissionStage[] = ['CONSULTATION', 'DESIGN', 'CORSET', 'FLORALS', 'FITTING'];

export function nextCommissionStage(stage: CommissionStage): CommissionStage | null {
  return COMMISSION_STAGES[COMMISSION_STAGES.indexOf(stage) + 1] ?? null;
}

export function previousCommissionStage(stage: CommissionStage): CommissionStage | null {
  return COMMISSION_STAGES[COMMISSION_STAGES.indexOf(stage) - 1] ?? null;
}
