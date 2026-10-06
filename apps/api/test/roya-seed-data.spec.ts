import { BRAND, toMinor } from '@newax/shared';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ATELIER_SIZES,
  CATEGORIES,
  COLLECTIONS,
  GOWN,
  MADE_TO_MEASURE,
  PRESENTATION_TRUNK,
  PRODUCTS,
  SHIPPING,
  depositMinor,
} from '../prisma/roya-data';

/**
 * ROYA's seed data is the shop's catalogue until the atelier edits it, so its
 * invariants are tested without a database: a typo here is a broken product
 * page, a missing photo or a wrong price on launch day.
 */
const PUBLIC_DIR = join(__dirname, '..', '..', 'storefront', 'public');

describe('ROYA seed data', () => {
  it('has unique product slugs and valid categories', () => {
    const slugs = PRODUCTS.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const categories = new Set<string>(CATEGORIES.map((category) => category.slug));
    for (const product of PRODUCTS) expect(categories.has(product.categorySlug)).toBe(true);
  });

  it('has copy in both languages for everything a customer reads', () => {
    for (const product of PRODUCTS) {
      for (const field of ['name', 'blurb', 'intro', 'details', 'craft', 'care'] as const) {
        expect(product[field].en.trim().length).toBeGreaterThan(0);
        expect(product[field].ar.trim().length).toBeGreaterThan(0);
        // The Arabic really is Arabic: it contains Arabic script.
        expect(product[field].ar).toMatch(/[؀-ۿ]/);
      }
      for (const media of product.media) {
        expect(media.alt.en.trim().length).toBeGreaterThan(0);
        expect(media.alt.ar).toMatch(/[؀-ۿ]/);
      }
    }
  });

  it('references only media that exists in the storefront', () => {
    const missing: string[] = [];
    for (const product of PRODUCTS) {
      for (const media of product.media) {
        if (!existsSync(join(PUBLIC_DIR, media.url))) missing.push(`${product.slug}: ${media.url}`);
        // A film also needs its webm and poster, which the storefront finds by name.
        const film = /^\/media\/video\/([\w-]+)\.mp4$/.exec(media.url);
        if (film) {
          for (const sibling of [`/media/video/${film[1]}.webm`, `/media/posters/${film[1]}.jpg`]) {
            if (!existsSync(join(PUBLIC_DIR, sibling))) missing.push(`${product.slug}: ${sibling}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('prices a commission at its deposit, and nothing else at a deposit', () => {
    for (const product of PRODUCTS) {
      expect(Number.isInteger(product.priceMajor)).toBe(true);
      expect(product.priceMajor).toBeGreaterThan(0);
    }
    const mehr = PRODUCTS.find((product) => product.type === 'bespoke')!;
    expect(mehr.priceMajor).toBe(28_500);
    // 50% of AED 28,500, in fils: the design's "AED 14,250".
    expect(BRAND.commerce.bespokeDepositPercent).toBe(50);
    expect(depositMinor(mehr.priceMajor)).toBe(toMinor(14_250));
    expect(PRODUCTS.filter((product) => product.type === 'bespoke')).toHaveLength(1);
  });

  it('offers made to measure only on a commission, and one size on an accessory', () => {
    expect(MADE_TO_MEASURE).toBe('MTM');
    expect(ATELIER_SIZES).toHaveLength(6);
    for (const product of PRODUCTS) {
      if (product.type === 'accessory') expect(product.shades.length).toBeGreaterThan(0);
    }
  });

  it('keeps the couture trunk out of the catalogue it must not appear in, at the design price', () => {
    expect(PRODUCTS.map((product) => product.slug)).not.toContain(PRESENTATION_TRUNK.slug);
    expect(PRESENTATION_TRUNK.priceMajor).toBe(1_200);
    expect(PRESENTATION_TRUNK.name.ar).toMatch(/[؀-ۿ]/);
    expect(PRESENTATION_TRUNK.description.ar).toMatch(/[؀-ۿ]/);
  });

  it('puts every collection member in the catalogue, once', () => {
    const slugs = new Set(PRODUCTS.map((product) => product.slug));
    for (const collection of COLLECTIONS) {
      expect(new Set(collection.members).size).toBe(collection.members.length);
      for (const member of collection.members) expect(slugs.has(member)).toBe(true);
    }
  });

  it('defines the measurements the design asks for, in order and with sane bounds', () => {
    expect(GOWN.fields.map((field) => field.key)).toEqual([
      'bust',
      'underbust',
      'waist',
      'hips',
      'shoulder_width',
      'arm_length',
      'nape_to_waist',
      'floor_length',
    ]);
    for (const field of GOWN.fields) {
      expect(field.min).toBeLessThan(field.max);
      expect(field.ar).toMatch(/[؀-ۿ]/);
    }
  });

  it('gives every shipping method a rate in exactly the zone it serves', () => {
    const zones = new Set<string>(SHIPPING.zones.map((zone) => zone.key));
    const methods = new Set<string>(SHIPPING.methods.map((method) => method.key));
    for (const rate of SHIPPING.rates) {
      expect(zones.has(rate.zone)).toBe(true);
      expect(methods.has(rate.method)).toBe(true);
    }
    // The UAE zone lists every emirate the checkout offers; the other is the catch-all.
    expect(SHIPPING.zones.find((zone) => zone.key === 'uae')!.cities).toEqual(BRAND.locale.regions);
    expect(SHIPPING.zones.filter((zone) => zone.isCatchAll)).toHaveLength(1);
  });
});
