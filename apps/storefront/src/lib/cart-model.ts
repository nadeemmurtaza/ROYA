import { BRAND } from '@newax/shared';
import type { Cart, CartLine } from '@/types/api';
import { MADE_TO_MEASURE, type PieceType } from './product-model';

/** The couture trunk is a paid line in the bag, but it is not a piece: it is how the order is presented. */
const TRUNK_SLUG = BRAND.storefront.featured.presentationTrunk;

export const isTrunk = (line: Pick<CartLine, 'slug'>): boolean => line.slug === TRUNK_SLUG;

export const piecesIn = (cart: Pick<Cart, 'items'> | null): CartLine[] => (cart ? cart.items.filter((line) => !isTrunk(line)) : []);

export const trunkIn = (cart: Pick<Cart, 'items'> | null): CartLine | undefined => cart?.items.find(isTrunk);

/** How many pieces the bag holds (what the header badge shows), not counting the trunk. */
export const pieceCount = (cart: Pick<Cart, 'items'> | null): number =>
  piecesIn(cart).reduce((total, line) => total + line.quantity, 0);

/**
 * The cart's variant label is "size / shade" ("FR 38 / Black", "MTM / Ivory",
 * "One size / Ivory"). Split it so the shade and the fit can each be translated.
 */
export function parseVariantLabel(label: string | null | undefined): { fit: string | null; shade: string | null } {
  if (!label) return { fit: null, shade: null };
  const [fit, shade] = label.split(' / ').map((part) => part.trim());
  return {
    fit: fit && fit.toLowerCase() !== 'one size' ? fit : null,
    shade: shade || null,
  };
}

export const isMadeToMeasure = (fit: string | null): boolean => fit === MADE_TO_MEASURE;

export interface LineMeta {
  type: PieceType;
  /** The whole price, in fils: what a commission's deposit is a part of. */
  basePrice: number;
  category: string;
}

/**
 * What is still owed on commissions after today's deposits: the whole price less
 * the deposit in the bag, for each commission line. Only a commission has any;
 * a line whose product has not loaded yet counts as nothing owed rather than a guess.
 */
export function balanceDue(lines: readonly CartLine[], meta: ReadonlyMap<string, LineMeta>): number {
  return lines.reduce((total, line) => {
    const info = meta.get(line.slug);
    if (!info || info.type !== 'bespoke') return total;
    return total + Math.max(0, info.basePrice - line.unitPrice) * line.quantity;
  }, 0);
}

export type Presentation = 'box' | 'trunk' | 'plain';
const PRESENTATIONS: readonly Presentation[] = ['box', 'trunk', 'plain'];
export const isPresentation = (value: unknown): value is Presentation => PRESENTATIONS.includes(value as Presentation);

/** What the bag remembers between visits within a tab: how to present it, and the handwritten note. */
export interface BagExtras {
  presentation: Presentation;
  giftNote: string;
}
/** How each presentation is written on the order, for the staff who pack it: always English, whatever the customer's language. */
export const PRESENTATION_LABEL: Record<Presentation, string> = {
  box: 'The ROYA box',
  trunk: 'Couture trunk',
  plain: 'Unbranded packaging',
};

export const DEFAULT_EXTRAS: BagExtras = { presentation: 'box', giftNote: '' };
export const GIFT_NOTE_LIMIT = 240;

export function parseExtras(raw: string | null): BagExtras {
  if (!raw) return DEFAULT_EXTRAS;
  try {
    const value = JSON.parse(raw) as Partial<BagExtras>;
    return {
      presentation: isPresentation(value.presentation) ? value.presentation : DEFAULT_EXTRAS.presentation,
      giftNote: typeof value.giftNote === 'string' ? value.giftNote.slice(0, GIFT_NOTE_LIMIT) : '',
    };
  } catch {
    return DEFAULT_EXTRAS;
  }
}
