import { Test } from '@nestjs/testing';
import { BRAND, toMinor } from '@newax/shared';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ShippingService, computeRateFee } from './shipping.service';

/**
 * ROYA's acceptance test for the shipping the seed creates (prisma/seed.ts):
 * the design's three delivery methods, white-glove and collection inside the
 * UAE and an insured courier outside it.
 *
 * It replaces the Blueprint's version of this file, which asserted the Blueprint's
 * own home-market zones (and a backfill from an old Setting). Those rows are still
 * in the schema's history, so what is worth pinning here is that they are inert
 * (migration 20261005120000_roya_deactivate_inherited_shipping) and that ROYA's own
 * zones quote correctly. Runs against a seeded database, like the other
 * DB-backed specs.
 */
describe('ShippingService, ROYA zones', () => {
  let service: ShippingService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ShippingService, PrismaService],
    }).compile();

    service = module.get(ShippingService);
    prisma = module.get(PrismaService);
  });

  const BASKET = toMinor(21_050);

  it('resolves every emirate to the UAE zone, whatever the casing', async () => {
    for (const emirate of BRAND.locale.regions) {
      for (const spelling of [emirate, emirate.toUpperCase(), ` ${emirate.toLowerCase()} `]) {
        const zone = await service.resolveZone(spelling);
        expect(zone.key).toBe('uae');
      }
    }
  });

  it('delivers white-glove inside the UAE for free, at any basket size', async () => {
    for (const subtotal of [toMinor(950), BASKET, toMinor(250_000)]) {
      const quote = await service.quote('Dubai', subtotal, { methodKey: 'white_glove' });
      expect(quote.zoneKey).toBe('uae');
      expect(quote.fee).toBe(0);
    }
  });

  it('lets a client collect at the atelier for free', async () => {
    const quote = await service.quote('Abu Dhabi', BASKET, { methodKey: 'atelier_collection' });
    expect(quote.methodKey).toBe('atelier_collection');
    expect(quote.fee).toBe(0);
  });

  it('sends everywhere else to the catch-all and charges the insured courier: AED 950 flat, 3 to 5 days', async () => {
    const quote = await service.quote('London', BASKET, { methodKey: 'international_courier' });
    expect(quote.zoneKey).toBe('international');
    expect(quote.fee).toBe(toMinor(950));
    expect(quote.etaMinDays).toBe(3);
    expect(quote.etaMaxDays).toBe(5);
  });

  it('refuses a method that has no rate in the zone, rather than quoting zero', async () => {
    await expect(service.quote('Dubai', BASKET, { methodKey: 'international_courier' })).rejects.toThrow(/No shipping rate/);
    await expect(service.quote('London', BASKET, { methodKey: 'white_glove' })).rejects.toThrow(/No shipping rate/);
  });

  it("keeps the schema's inherited home-market zones inert: a city they list does not match them", async () => {
    // "Karachi" and "Lahore" are in the inherited zones' city lists. With those
    // zones deactivated they fall through to ROYA's one catch-all.
    for (const city of ['Karachi', 'Lahore', 'Multan']) {
      const zone = await service.resolveZone(city);
      expect(zone.key).toBe('international');
    }
    const inherited = await prisma.shippingZone.findMany({
      where: { key: { in: ['karachi', 'punjab', 'rest_of_pakistan'] } },
      select: { key: true, isActive: true },
    });
    for (const zone of inherited) expect(zone.isActive).toBe(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

describe('computeRateFee — pure logic', () => {
  it('FLAT: fee below the free-above threshold', () => {
    expect(computeRateFee({ type: 'FLAT', fee: 15_000, baseFee: 0, includedUnits: 0, freeAbove: 300_000 }, 100_000, 0, 1)).toBe(15_000);
  });

  it('FLAT: zero at or above the free-above threshold', () => {
    expect(computeRateFee({ type: 'FLAT', fee: 15_000, baseFee: 0, includedUnits: 0, freeAbove: 300_000 }, 300_000, 0, 1)).toBe(0);
  });

  it('FLAT: never free when freeAbove is null', () => {
    expect(computeRateFee({ type: 'FLAT', fee: 15_000, baseFee: 0, includedUnits: 0, freeAbove: null }, 10_000_000, 0, 1)).toBe(15_000);
  });

  it('BY_WEIGHT: base fee plus per-kg above includedUnits, rounded up', () => {
    const rate = { type: 'BY_WEIGHT' as const, fee: 2_000, baseFee: 10_000, includedUnits: 1_000, freeAbove: null };
    expect(computeRateFee(rate, 0, 1_000, 1)).toBe(10_000); // exactly the included weight
    expect(computeRateFee(rate, 0, 1_500, 1)).toBe(12_000); // 0.5kg over -> rounds up to 1 extra kg
    expect(computeRateFee(rate, 0, 3_000, 1)).toBe(14_000); // 2kg over
  });

  it('BY_ITEM: base fee plus per-item above includedUnits', () => {
    const rate = { type: 'BY_ITEM' as const, fee: 500, baseFee: 5_000, includedUnits: 2, freeAbove: null };
    expect(computeRateFee(rate, 0, 0, 2)).toBe(5_000);
    expect(computeRateFee(rate, 0, 0, 5)).toBe(6_500);
  });
});
