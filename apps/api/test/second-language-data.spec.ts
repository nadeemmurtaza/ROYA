import { SECOND_LOCALE } from '@newax/shared';
import { PrismaService } from '../src/core/prisma/prisma.service';

/**
 * ROYA's second language is Arabic. The Blueprint's reference data seeds Urdu
 * (the starter loyalty tiers and the Pakistani shipping zones' labels); migration
 * 20261008120000_roya_arabic_for_inherited_urdu_rows rewrites those rows. This
 * test is what notices if an upgrade sync puts the Urdu back or a new seed
 * adds some, and it runs against a migrated and seeded database like the other
 * DB-backed specs.
 *
 * The letters below are the ones Urdu writes and Arabic does not: ٹ ڈ ڑ ں ھ ہ ے
 * گ ک ی چ پ ژ ۓ and the full stop ۔.
 */
const URDU_ONLY = /[ٹڈڑںھہےگکیچپژۓ۔]/;

describe('second-language data', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes the loyalty tiers' second-language benefit in Arabic", async () => {
    const tiers = await prisma.loyaltyTier.findMany({ select: { id: true, benefitDescriptionUr: true } });
    expect(tiers.length).toBeGreaterThanOrEqual(3);
    for (const tier of tiers) {
      expect(tier.benefitDescriptionUr ?? '').not.toMatch(URDU_ONLY);
      expect(tier.benefitDescriptionUr ?? '').toMatch(/[؀-ۿ]/);
    }
  });

  it("keeps no 'ur' translation on a shipping zone or method", async () => {
    expect(await prisma.shippingZoneTranslation.count({ where: { locale: 'ur' } })).toBe(0);
    expect(await prisma.shippingMethodTranslation.count({ where: { locale: 'ur' } })).toBe(0);
  });

  it("labels every shipping zone and method in the brand's second language", async () => {
    const zones = await prisma.shippingZoneTranslation.findMany({ where: { locale: SECOND_LOCALE } });
    const methods = await prisma.shippingMethodTranslation.findMany({ where: { locale: SECOND_LOCALE } });
    for (const row of [...zones, ...methods]) expect(row.label).not.toMatch(URDU_ONLY);
    // Three inherited zones and one inherited method, plus ROYA's two zones and three methods.
    expect(zones.length).toBeGreaterThanOrEqual(5);
    expect(methods.length).toBeGreaterThanOrEqual(4);
  });
});
