import { toMinor } from '@newax/shared';

/** What the "link an item" form holds: every box is text, because that is what a person types. */
export interface SupplierProductDraft {
  variantId: string;
  /** What the supplier charges, in the shop's currency and major units ("12.50"). */
  cost: string;
  /** Smallest quantity the supplier will sell. Blank means 1. */
  moq: string;
  /** Days from order to delivery. Blank means "use the supplier's own". */
  leadTimeDays: string;
  supplierSku: string;
  isPreferred: boolean;
}

/** The body `POST /admin/suppliers/:id/products` takes. Money is in minor units. */
export interface SupplierProductBody {
  variantId: string;
  lastCost: number;
  moq: number;
  leadTimeDays?: number;
  supplierSku?: string;
  isPreferred: boolean;
}

export type SupplierProductResult = { ok: true; body: SupplierProductBody } | { ok: false; error: string };

const isWhole = (value: number): boolean => Number.isInteger(value);

/**
 * Turns the form into the request, or says in words what to fix. The API checks
 * the same limits; this is so a person is told before the round trip, and so the
 * major-to-minor conversion is done in one tested place.
 */
export function supplierProductBody(draft: SupplierProductDraft): SupplierProductResult {
  if (!draft.variantId) return { ok: false, error: 'Choose an item to link.' };

  const costText = draft.cost.trim();
  const cost = Number(costText);
  if (costText === '' || !Number.isFinite(cost) || cost < 0) {
    return { ok: false, error: 'Enter what this supplier charges for one unit.' };
  }

  const moqText = draft.moq.trim();
  const moq = moqText === '' ? 1 : Number(moqText);
  if (!isWhole(moq) || moq < 1) return { ok: false, error: 'The smallest order must be a whole number, 1 or more.' };

  const leadText = draft.leadTimeDays.trim();
  const leadTimeDays = leadText === '' ? undefined : Number(leadText);
  if (leadTimeDays !== undefined && (!isWhole(leadTimeDays) || leadTimeDays < 0)) {
    return { ok: false, error: 'Lead time must be a whole number of days, 0 or more.' };
  }

  const supplierSku = draft.supplierSku.trim();
  return {
    ok: true,
    body: {
      variantId: draft.variantId,
      lastCost: toMinor(cost),
      moq,
      ...(leadTimeDays !== undefined ? { leadTimeDays } : {}),
      ...(supplierSku ? { supplierSku } : {}),
      isPreferred: draft.isPreferred,
    },
  };
}
