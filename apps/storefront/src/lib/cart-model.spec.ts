import type { CartLine } from '@/types/api';
import { balanceDue, isTrunk, parseExtras, parseVariantLabel, pieceCount, piecesIn, trunkIn, type LineMeta } from './cart-model';

const line = (over: Partial<CartLine>): CartLine => ({
  id: 'l',
  productId: 'p',
  slug: 'noir',
  name: 'Noir',
  imageUrl: null,
  variantId: 'v',
  variantLabel: 'FR 38 / Black',
  sku: 'S',
  quantity: 1,
  unitPrice: 680_000,
  availableStock: 0,
  ...over,
});

describe('the trunk is how an order is presented, not a piece', () => {
  const cart = { items: [line({}), line({ id: 't', slug: 'couture-trunk', unitPrice: 120_000 }), line({ id: 'x', slug: 'lilas', quantity: 2 })] };

  it('is recognised by its slug and left out of the pieces and their count', () => {
    expect(isTrunk(cart.items[1]!)).toBe(true);
    expect(piecesIn(cart).map((item) => item.slug)).toEqual(['noir', 'lilas']);
    expect(pieceCount(cart)).toBe(3);
    expect(trunkIn(cart)?.id).toBe('t');
  });

  it('copes with no cart at all', () => {
    expect(piecesIn(null)).toEqual([]);
    expect(pieceCount(null)).toBe(0);
    expect(trunkIn(null)).toBeUndefined();
  });
});

describe('parseVariantLabel', () => {
  it('splits size and shade, and drops "One size"', () => {
    expect(parseVariantLabel('FR 38 / Black')).toEqual({ fit: 'FR 38', shade: 'Black' });
    expect(parseVariantLabel('MTM / Ivory')).toEqual({ fit: 'MTM', shade: 'Ivory' });
    expect(parseVariantLabel('One size / Ivory')).toEqual({ fit: null, shade: 'Ivory' });
  });
  it('survives a missing or odd label', () => {
    expect(parseVariantLabel(null)).toEqual({ fit: null, shade: null });
    expect(parseVariantLabel('Ivory')).toEqual({ fit: 'Ivory', shade: null });
  });
});

describe('balanceDue', () => {
  const meta = new Map<string, LineMeta>([
    ['mehr', { type: 'bespoke', basePrice: 2_850_000, category: 'Bridal' }],
    ['noir', { type: 'ready', basePrice: 680_000, category: 'Evening' }],
  ]);

  it('is the whole price less the deposit, for a commission only', () => {
    const lines = [line({ slug: 'mehr', unitPrice: 1_425_000 }), line({ slug: 'noir' })];
    expect(balanceDue(lines, meta)).toBe(1_425_000);
  });

  it('is nothing until the product is known, never a guess', () => {
    expect(balanceDue([line({ slug: 'mehr', unitPrice: 1_425_000 })], new Map())).toBe(0);
  });

  it('never goes negative', () => {
    expect(balanceDue([line({ slug: 'mehr', unitPrice: 9_999_999 })], meta)).toBe(0);
  });
});

describe('parseExtras', () => {
  it('reads what was saved', () => {
    expect(parseExtras('{"presentation":"trunk","giftNote":"With love"}')).toEqual({ presentation: 'trunk', giftNote: 'With love' });
  });
  it('falls back to the box and no note for anything unexpected', () => {
    expect(parseExtras(null)).toEqual({ presentation: 'box', giftNote: '' });
    expect(parseExtras('not json')).toEqual({ presentation: 'box', giftNote: '' });
    expect(parseExtras('{"presentation":"gold","giftNote":5}')).toEqual({ presentation: 'box', giftNote: '' });
  });
  it('keeps the note within its limit', () => {
    expect(parseExtras(JSON.stringify({ presentation: 'box', giftNote: 'x'.repeat(1000) })).giftNote).toHaveLength(240);
  });
});
