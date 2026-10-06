import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import type { Prisma, ShippingRate, ShippingRateType } from '../../../core/prisma/client';
import type {
  CreateShippingClassDto,
  CreateShippingMethodDto,
  CreateShippingRateDto,
  CreateShippingZoneDto,
  UpdateShippingClassDto,
  UpdateShippingMethodDto,
  UpdateShippingRateDto,
  UpdateShippingZoneDto,
} from './dto/shipping.dto';

/** One way to get the order to this destination, priced: what a checkout lists for the customer to choose. */
export interface ShippingOption {
  zoneKey: string;
  methodKey: string;
  /** The method's name in the asked-for language, falling back to English, then to its key. */
  label: string;
  /** Paisa. */
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
}

export interface ShippingQuote {
  zoneId: string;
  zoneKey: string;
  methodId: string;
  methodKey: string;
  /** Paisa. */
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
}

const zoneInclude = { translations: true, rates: true } satisfies Prisma.ShippingZoneInclude;
const methodInclude = { translations: true } satisfies Prisma.ShippingMethodInclude;
const classInclude = { translations: true } satisfies Prisma.ShippingClassInclude;

/**
 * WO-6.1 — shipping as data instead of `shipping.zones` (a JSON Setting):
 * queryable, reportable, extensible to weight/price-tiered rates. Checkout's
 * old resolveShippingZone(city) is replaced by quote() (orders -> fulfilment
 * in KNOWN_MODULE_COUPLINGS, same reasoning as orders -> tax: a synchronous
 * number checkout cannot commit without).
 */
@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Zones ------------------------------------------------------------

  listZones() {
    return this.prisma.shippingZone.findMany({ include: zoneInclude, orderBy: { order: 'asc' } });
  }

  async createZone(dto: CreateShippingZoneDto) {
    if (dto.isCatchAll) await this.clearOtherCatchAlls(null);
    return this.prisma.shippingZone.create({
      data: {
        key: dto.key,
        order: dto.order ?? 0,
        cities: dto.cities ?? [],
        isCatchAll: dto.isCatchAll ?? false,
        translations: { create: dto.translations },
      },
      include: zoneInclude,
    });
  }

  async updateZone(id: string, dto: UpdateShippingZoneDto) {
    await this.getZoneOrThrow(id);
    if (dto.isCatchAll) await this.clearOtherCatchAlls(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.translations) {
        for (const translation of dto.translations) {
          await tx.shippingZoneTranslation.upsert({
            where: { zoneId_locale: { zoneId: id, locale: translation.locale } },
            create: { zoneId: id, locale: translation.locale, label: translation.label },
            update: { label: translation.label },
          });
        }
      }
      return tx.shippingZone.update({
        where: { id },
        data: {
          cities: dto.cities,
          order: dto.order,
          isActive: dto.isActive,
          isCatchAll: dto.isCatchAll,
        },
        include: zoneInclude,
      });
    });
  }

  private async clearOtherCatchAlls(exceptId: string | null): Promise<void> {
    await this.prisma.shippingZone.updateMany({
      where: { isCatchAll: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isCatchAll: false },
    });
  }

  private async getZoneOrThrow(id: string) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('That shipping zone no longer exists.');
    return zone;
  }

  /**
   * Resolves a delivery city to its zone — same fallback order as the
   * Setting-backed resolveShippingZone() it replaces: exact city match, then
   * the catch-all (empty cities list), then the last zone by `order`.
   */
  async resolveZone(city: string) {
    const zones = await this.prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    const needle = city.trim().toLowerCase();

    const matched = zones.find((zone) => zone.cities.some((candidate) => candidate.toLowerCase() === needle));
    if (matched) return matched;

    const fallback = zones.find((zone) => zone.cities.length === 0 || zone.isCatchAll);
    if (fallback) return fallback;

    const last = zones[zones.length - 1];
    if (!last) throw new BadRequestException('No shipping zones are configured.');
    return last;
  }

  // --- Methods ------------------------------------------------------------

  listMethods() {
    return this.prisma.shippingMethod.findMany({ include: methodInclude, orderBy: { order: 'asc' } });
  }

  createMethod(dto: CreateShippingMethodDto) {
    return this.prisma.shippingMethod.create({
      data: {
        key: dto.key,
        courierKey: dto.courierKey,
        etaMinDays: dto.etaMinDays ?? 2,
        etaMaxDays: dto.etaMaxDays ?? 5,
        order: dto.order ?? 0,
        translations: { create: dto.translations },
      },
      include: methodInclude,
    });
  }

  async updateMethod(id: string, dto: UpdateShippingMethodDto) {
    const method = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('That shipping method no longer exists.');

    return this.prisma.$transaction(async (tx) => {
      if (dto.translations) {
        for (const translation of dto.translations) {
          await tx.shippingMethodTranslation.upsert({
            where: { methodId_locale: { methodId: id, locale: translation.locale } },
            create: { methodId: id, locale: translation.locale, label: translation.label },
            update: { label: translation.label },
          });
        }
      }
      return tx.shippingMethod.update({
        where: { id },
        data: {
          courierKey: dto.courierKey,
          etaMinDays: dto.etaMinDays,
          etaMaxDays: dto.etaMaxDays,
          order: dto.order,
          isActive: dto.isActive,
        },
        include: methodInclude,
      });
    });
  }

  // --- Rates ------------------------------------------------------------

  listRates(zoneId?: string) {
    return this.prisma.shippingRate.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: { zone: true, method: true },
    });
  }

  createRate(dto: CreateShippingRateDto) {
    return this.prisma.shippingRate.create({
      data: {
        zoneId: dto.zoneId,
        methodId: dto.methodId,
        type: dto.type ?? 'FLAT',
        fee: dto.fee,
        baseFee: dto.baseFee ?? 0,
        includedUnits: dto.includedUnits ?? 0,
        freeAbove: dto.freeAbove,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
      },
    });
  }

  async updateRate(id: string, dto: UpdateShippingRateDto) {
    const rate = await this.prisma.shippingRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('That shipping rate no longer exists.');
    return this.prisma.shippingRate.update({ where: { id }, data: dto });
  }

  async deleteRate(id: string): Promise<void> {
    await this.prisma.shippingRate.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('That shipping rate no longer exists.');
    });
  }

  // --- Shipping classes ---------------------------------------------------

  listClasses() {
    return this.prisma.shippingClass.findMany({ include: classInclude });
  }

  createClass(dto: CreateShippingClassDto) {
    return this.prisma.shippingClass.create({
      data: {
        key: dto.key,
        handlingFee: dto.handlingFee ?? 0,
        translations: { create: dto.translations },
      },
      include: classInclude,
    });
  }

  async updateClass(id: string, dto: UpdateShippingClassDto) {
    const shippingClass = await this.prisma.shippingClass.findUnique({ where: { id } });
    if (!shippingClass) throw new NotFoundException('That shipping class no longer exists.');
    return this.prisma.shippingClass.update({
      where: { id },
      data: { handlingFee: dto.handlingFee, isActive: dto.isActive },
      include: classInclude,
    });
  }

  /** Sum of handlingFee across a set of ShippingClass ids — zero for an empty or all-null set. */
  async handlingFeeFor(classIds: Array<string | null | undefined>): Promise<number> {
    const ids = [...new Set(classIds.filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return 0;
    const classes = await this.prisma.shippingClass.findMany({ where: { id: { in: ids } } });
    return classes.reduce((sum, c) => sum + c.handlingFee, 0);
  }

  // --- Quoting --------------------------------------------------------------

  /**
   * The number checkout actually needs. Byte-identical, for the three
   * migrated zones, to what the old Setting-backed resolveShippingZone()
   * produced — asserted by shipping-migration.spec.ts against the rows the
   * migration itself seeds.
   */
  async quote(
    city: string,
    subtotalMinor: number,
    opts?: { methodKey?: string; weightGrams?: number; itemCount?: number },
  ): Promise<ShippingQuote> {
    const zone = await this.resolveZone(city);

    // With no method named, use the first active one that has a rate in THIS zone. Taking the first
    // active method overall fails for every zone that method does not serve: a brand that delivers by
    // hand at home and by courier abroad could not quote (or place) a single international order.
    const method = opts?.methodKey
      ? await this.prisma.shippingMethod.findUnique({ where: { key: opts.methodKey } })
      : ((await this.prisma.shippingMethod.findFirst({
          where: { isActive: true, rates: { some: { zoneId: zone.id, isActive: true } } },
          orderBy: { order: 'asc' },
        })) ?? (await this.prisma.shippingMethod.findFirst({ where: { isActive: true }, orderBy: { order: 'asc' } })));
    if (!method) throw new BadRequestException('No shipping method is configured.');

    const rates = await this.prisma.shippingRate.findMany({
      where: { zoneId: zone.id, methodId: method.id, isActive: true },
    });
    const rate = this.selectRate(rates, subtotalMinor);
    if (!rate) {
      throw new BadRequestException(
        `No shipping rate is configured for "${zone.key}" via "${method.key}".`,
      );
    }

    const fee = computeRateFee(rate, subtotalMinor, opts?.weightGrams ?? 0, opts?.itemCount ?? 1);

    return {
      zoneId: zone.id,
      zoneKey: zone.key,
      methodId: method.id,
      methodKey: method.key,
      fee,
      etaMinDays: method.etaMinDays,
      etaMaxDays: method.etaMaxDays,
    };
  }

  /**
   * Every active method that has a rate for this destination, priced for this basket. A destination
   * whose zone no method serves yields an empty list, which the checkout shows as "we cannot deliver
   * there online" instead of letting the customer fill in a form that cannot be placed.
   */
  async options(city: string, subtotalMinor: number, locale: string = 'en'): Promise<ShippingOption[]> {
    const zone = await this.resolveZone(city);
    const methods = await this.prisma.shippingMethod.findMany({
      where: { isActive: true, rates: { some: { zoneId: zone.id, isActive: true } } },
      include: { translations: true, rates: { where: { zoneId: zone.id, isActive: true } } },
      orderBy: { order: 'asc' },
    });

    return methods.flatMap((method) => {
      const rate = this.selectRate(method.rates, subtotalMinor);
      if (!rate) return [];
      const label =
        method.translations.find((entry) => entry.locale === locale)?.label ??
        method.translations.find((entry) => entry.locale === 'en')?.label ??
        method.key;
      return [
        {
          zoneKey: zone.key,
          methodKey: method.key,
          label,
          fee: computeRateFee(rate, subtotalMinor, 0, 1),
          etaMinDays: method.etaMinDays,
          etaMaxDays: method.etaMaxDays,
        },
      ];
    });
  }

  /** BY_PRICE bands the same zone+method pair across several rows; everything else has exactly one. */
  private selectRate(rates: ShippingRate[], subtotalMinor: number): ShippingRate | null {
    if (rates.length === 0) return null;
    const banded = rates.filter((rate) => rate.type === 'BY_PRICE');
    if (banded.length === 0) return rates[0];

    return (
      banded.find(
        (rate) =>
          (rate.minValue === null || subtotalMinor >= rate.minValue) &&
          (rate.maxValue === null || subtotalMinor < rate.maxValue),
      ) ?? null
    );
  }
}

/** Pure — unit-tested directly against the migrated defaults. */
export function computeRateFee(
  rate: { type: ShippingRateType; fee: number; baseFee: number; includedUnits: number; freeAbove: number | null },
  subtotalMinor: number,
  weightGrams: number,
  itemCount: number,
): number {
  if (rate.freeAbove !== null && subtotalMinor >= rate.freeAbove) return 0;

  switch (rate.type) {
    case 'FLAT':
    case 'BY_PRICE':
      return rate.fee;
    case 'BY_WEIGHT': {
      const extraKg = Math.max(0, Math.ceil((weightGrams - rate.includedUnits) / 1000));
      return rate.baseFee + extraKg * rate.fee;
    }
    case 'BY_ITEM': {
      const extraItems = Math.max(0, itemCount - rate.includedUnits);
      return rate.baseFee + extraItems * rate.fee;
    }
    default:
      return rate.fee;
  }
}
