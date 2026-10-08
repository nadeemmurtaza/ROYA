import { BRAND, intlTag, type Locale, type OrderStatus } from '@newax/shared';

/**
 * The atelier desk's rules, kept out of the components so they are tested.
 *
 * Everything here decides what to *show*. What a person may actually do is
 * decided by the API on every request (PermissionsGuard); hiding a button the
 * server would refuse is a courtesy, never the control.
 */

// ── Who sees what ───────────────────────────────────────────────────────────

/** The permission each desk section is built on: the same keys the API's controllers demand. */
export const DESK_PERMISSION = {
  orders: 'orders.manage',
  payments: 'payments.approve',
  requests: 'crm.manage',
  dispatch: 'fulfilment.manage',
} as const;

export const DESK_SECTIONS = ['orders', 'payments', 'requests'] as const;
export type DeskSection = (typeof DESK_SECTIONS)[number];

/** The sections a signed-in person has the permission for, in the desk's order. */
export function deskSections(permissions: readonly string[] | undefined): DeskSection[] {
  const held = new Set(permissions ?? []);
  return DESK_SECTIONS.filter((section) => held.has(DESK_PERMISSION[section]));
}

// ── Orders ──────────────────────────────────────────────────────────────────

/**
 * Which status may follow which: a copy of `ALLOWED_TRANSITIONS` in
 * apps/api/src/modules/sales/orders/orders.service.ts, used only to decide
 * which buttons to offer. The API refuses a move it does not allow, and a spec
 * reads the engine's table and fails if the two drift apart.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

const SIDE_STEPS: readonly OrderStatus[] = ['CANCELLED', 'RETURNED'];

/** The next step along the order's life, if it has one: the one button the page leads with. */
export function forwardStep(status: OrderStatus): OrderStatus | null {
  return ORDER_TRANSITIONS[status].find((next) => !SIDE_STEPS.includes(next)) ?? null;
}

/** The ways an order leaves its normal path (cancelled, returned): offered quietly, behind a confirmation. */
export function sideSteps(status: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[status].filter((next) => SIDE_STEPS.includes(next));
}

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && Object.hasOwn(ORDER_TRANSITIONS, value);

/** What the desk shows against an order about its money. */
export type PaymentState = 'check' | 'waiting' | 'paid' | 'refunded' | 'failed' | 'none';

export interface PaymentLike {
  status: string;
  receiptUrl?: string | null;
}

/**
 * One word for the order's payment. A paid payment wins over a stale pending
 * one; otherwise the newest payment speaks (the engine lists them newest first).
 */
export function paymentState(payments: readonly PaymentLike[] | undefined): PaymentState {
  if (!payments || payments.length === 0) return 'none';
  const paid = payments.find((payment) => payment.status === 'PAID');
  if (paid) return 'paid';
  const latest = payments[0]!;
  switch (latest.status) {
    case 'AWAITING_APPROVAL':
      return latest.receiptUrl ? 'check' : 'waiting';
    case 'PENDING':
      return 'waiting';
    case 'REFUNDED':
      return 'refunded';
    case 'FAILED':
    case 'CANCELLED':
      return 'failed';
    default:
      return 'none';
  }
}

/** A payment is the desk's to confirm when it is waiting on a person and no gateway will settle it. */
export const canConfirm = (payment: PaymentLike): boolean => payment.status === 'AWAITING_APPROVAL';

export const canRefund = (payment: PaymentLike): boolean => payment.status === 'PAID';

/**
 * Where a receipt can be opened from. With local storage the API stores an
 * absolute address on its own host (`http://localhost:3001/api/v1/files/…`),
 * which a browser outside that host cannot reach; the same path on the
 * storefront's own origin is rewritten to the API. Any other address (a CDN,
 * S3) is used as it is.
 */
export function receiptHref(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith('/api/v1/files/') ? `${parsed.pathname}${parsed.search}` : url;
  } catch {
    return url;
  }
}

export interface NoteLine {
  label: string | null;
  value: string;
}

/**
 * The order note the storefront writes ("Delivery: white glove", "Presentation:
 * The ROYA box", …) as label/value lines. A line without a label is the
 * client's own words and is kept whole.
 */
export function noteLines(note: string | null | undefined): NoteLine[] {
  return (note ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([A-Za-z][A-Za-z ]{0,30}):\s*(.+)$/.exec(line);
      return match ? { label: match[1]!, value: match[2]! } : { label: null, value: line };
    });
}

// ── Reaching the client ─────────────────────────────────────────────────────

/** A wa.me link for a client's number, or null when there is none worth dialling. */
export function whatsappLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

export function phoneLink(phone: string | null | undefined): string | null {
  const dialable = (phone ?? '').replace(/[^\d+]/g, '');
  return dialable.replace(/\D/g, '').length >= 7 ? `tel:${dialable}` : null;
}

export function mailLink(email: string | null | undefined): string | null {
  return email && /^[^\s@]+@[^\s@]+$/.test(email) ? `mailto:${email}` : null;
}

// ── Time ────────────────────────────────────────────────────────────────────

/** A date and time in the shop's own timezone, whatever the staff member's clock says. */
export function formatStamp(locale: Locale, value: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BRAND.locale.timeZone,
  }).format(new Date(value));
}

// ── The address a parcel goes to ────────────────────────────────────────────

/** The address lines in the order a courier reads them, empties dropped and a repeated line ("Dubai, Dubai") said once. */
export function addressLines(address: Record<string, string | null> | null | undefined): string[] {
  if (!address) return [];
  const lines: string[] = [];
  for (const part of [address.line1, address.line2, address.city, address.province, address.country]) {
    const line = (part ?? '').trim();
    if (line && lines[lines.length - 1]?.toLowerCase() !== line.toLowerCase()) lines.push(line);
  }
  return lines;
}
