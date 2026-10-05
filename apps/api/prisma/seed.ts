import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import {
  BRAND,
  PERMISSION_CATALOG,
  ROLE_PERMISSION_SEED,
  SECOND_LOCALE,
  toMinor,
  type PermissionKey,
} from '@newax/shared';
import { PrismaClient, type Prisma, type UserRole } from '../src/generated/prisma';

config({ path: ['.env', '../../.env'], quiet: true });

import { EventBusService } from '../src/core/events/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../src/core/audit/audit.service';
import { InventoryService } from '../src/modules/supply-chain/inventory/inventory.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { SettingKey } from '../src/core/settings/settings.defaults';
import { StockIntakeRegistry } from '../src/core/extension-points/stock-intake.registry';
import { EntityEnrichmentRegistry } from '../src/core/extension-points/entity-enrichment.registry';
import { IntentRouterService } from '../src/core/intent/intent-router.service';
import { CHART_OF_ACCOUNTS } from '../src/modules/money/accounting/chart-of-accounts';
import {
  ATELIER_SIZES,
  CATEGORIES,
  COLLECTIONS,
  GOWN,
  MADE_TO_MEASURE,
  PRODUCTS,
  SHIPPING,
  depositMinor,
  type RoyaProduct,
} from './roya-data';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const eventBus = new EventBusService(prismaService, new EventEmitter2());
const audit = new AuditService(prismaService);
const inventoryService = new InventoryService(
  prismaService,
  audit,
  eventBus,
  new StockIntakeRegistry(),
  new EntityEnrichmentRegistry(),
  new IntentRouterService(),
);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Seeds a working ROYA: permissions and roles, the reference data every module
 * needs, then ROYA's own catalogue, gown measurements, UAE shipping, 5% VAT and
 * the made-to-order setting.
 *
 * Idempotent, and deliberately timid about edits: reference data is upserted,
 * but catalogue, shipping, tax and settings rows are only CREATED when absent.
 * Once the atelier has changed a price, a label or a setting in the back office,
 * a later seed run never puts it back. (Fixing a typo in this data after launch
 * is an edit in the back office, not a re-seed.)
 */
async function main(): Promise<void> {
  // roya-data.ts is written in English and Arabic. If the brand's second locale
  // ever changes, the copy has to be translated, not silently stored under the
  // wrong language code.
  if (SECOND_LOCALE !== 'ar') {
    throw new Error(
      `prisma/roya-data.ts is written in English and Arabic, but BRAND.locale's second locale is "${SECOND_LOCALE}". Translate the data first.`,
    );
  }

  console.warn('Seeding…');

  await seedPermissions();
  const users = await seedUsers();
  await seedRoles();
  await seedOrgStructure();
  await seedChartOfAccounts();
  await seedExpenseCategories();
  await seedReturnReasons();
  await seedGown();
  const categories = await seedCategories();
  await seedCatalogue(categories);
  await seedCollections();
  await seedShipping();
  await seedTax();
  await seedSettings();
  // Every movement of value names a location, so the default one must exist
  // before the first order tries to post stock to it.
  await inventoryService.defaultLocationId();

  console.warn('Seed complete.');
  console.warn(`  Admin: ${users.admin.email}${IS_PRODUCTION ? '' : ` / ${process.env.SEED_ADMIN_PASSWORD ?? 'admin12345'}`}`);
  if (!IS_PRODUCTION) {
    console.warn('  Staff: staff@roya.example / staff12345');
    console.warn('  Seamstress: seamstress@roya.example / seamstress12345');
    console.warn('  Customer: mariam@example.com / customer12345');
  }
}

/**
 * Loads the permission catalog and, for any permission that has never been
 * granted to anyone, applies its default role grants from
 * ROLE_PERMISSION_SEED (@newax/shared).
 *
 * The label/category upsert always runs — that's just display metadata. The
 * grant step deliberately does not: once a permission has at least one
 * RolePermission row, an admin may have edited it from /admin/settings, so a
 * later seed run must never add or remove a grant on top of that. Only a
 * brand-new permission — one this run's upsert just created for the first
 * time — has zero existing grants and picks up its defaults here.
 */
async function seedPermissions(): Promise<void> {
  const permissionIds = new Map<string, string>();

  for (const def of PERMISSION_CATALOG) {
    const record = await prisma.permission.upsert({
      where: { key: def.key },
      update: { label: def.label, category: def.category },
      create: { key: def.key, label: def.label, category: def.category },
    });
    permissionIds.set(def.key, record.id);
  }

  const alreadyManaged = new Set(
    (await prisma.rolePermission.findMany({ select: { permissionId: true } })).map(
      (row) => row.permissionId,
    ),
  );

  for (const [role, keys] of Object.entries(ROLE_PERMISSION_SEED) as Array<
    [UserRole, readonly PermissionKey[]]
  >) {
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId || alreadyManaged.has(permissionId)) continue;

      await prisma.rolePermission.create({ data: { role, permissionId } });
    }
  }
}

/**
 * One-time bootstrap of the custom-roles system onto the old fixed-enum
 * one: creates a real `Role` row for each of the four `UserRole` enum
 * values, copies each one's *current* `RolePermission` grants (not the
 * static `ROLE_PERMISSION_SEED` constant — a deployment may have hand-edited
 * these from /admin/settings already, and the backfill must carry that
 * forward, not reset it), and assigns every existing user the `Role`
 * matching their current `role` column.
 *
 * Strictly one-time: if any `Role` row already exists — from this having
 * run before, or from a super admin having created a custom role since —
 * this returns immediately and touches nothing. There is no "re-sync"
 * step, on purpose: once roles are real, editable rows, a later seed run
 * asserting anything about them would fight whatever an admin has since
 * done, the same reasoning `seedPermissions()` already applies to grants.
 */
async function seedRoles(): Promise<void> {
  const alreadySeeded = await prisma.role.count();
  if (alreadySeeded > 0) return;

  console.warn('Seeding roles (one-time: migrating the fixed role enum into real Role rows)…');

  const ROLE_DISPLAY: Record<UserRole, { name: string; description: string }> = {
    CUSTOMER: { name: 'Customer', description: 'A storefront shopper — the default for every signup.' },
    TAILOR: { name: 'Tailor', description: 'Works the stitching queue.' },
    STAFF: { name: 'Staff', description: 'Day-to-day back-office operations.' },
    ADMIN: { name: 'Admin', description: 'Full back-office access, including settings and permissions.' },
  };

  const roleIdByEnum = new Map<UserRole, string>();

  for (const enumRole of Object.keys(ROLE_DISPLAY) as UserRole[]) {
    const { name, description } = ROLE_DISPLAY[enumRole];
    const role = await prisma.role.create({ data: { name, description } });
    roleIdByEnum.set(enumRole, role.id);

    const currentGrants = await prisma.rolePermission.findMany({ where: { role: enumRole } });
    if (currentGrants.length > 0) {
      await prisma.roleGrant.createMany({
        data: currentGrants.map((grant) => ({ roleId: role.id, permissionId: grant.permissionId })),
        skipDuplicates: true,
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  if (users.length > 0) {
    await prisma.userRoleAssignment.createMany({
      data: users.map((user) => ({ userId: user.id, roleId: roleIdByEnum.get(user.role)! })),
      skipDuplicates: true,
    });
  }

  console.warn(`  Migrated ${users.length} user(s) onto the new Role system.`);
}

/**
 * hr-people-org/19-org-structure-offices-departments.md WO-19.1 — every
 * deployment gets exactly one root `OrgUnit`, named from `brand.ts`, so a
 * Solo shop that never opens the org-structure screen still has a real
 * tree underneath it (one row) rather than an empty table later code has
 * to special-case. Idempotent: does nothing once any `OrgUnit` exists —
 * once a real admin has built out a tree, a later seed run must never
 * re-assert its own idea of "the root," the same "never re-sync past the
 * first run" discipline `seedRoles()` already applies just above.
 */
async function seedOrgStructure(): Promise<void> {
  const headOfficeType = await prisma.orgUnitType.upsert({
    where: { key: 'head_office' },
    update: { label: 'Head Office', rank: 0, isOffice: true },
    create: { key: 'head_office', label: 'Head Office', rank: 0, isOffice: true },
  });

  const alreadySeeded = await prisma.orgUnit.count();
  if (alreadySeeded > 0) return;

  const root = await prisma.orgUnit.create({
    data: { code: 'hq', name: BRAND.identity.name, typeId: headOfficeType.id, path: [], depth: 0 },
  });
  await prisma.orgUnit.update({ where: { id: root.id }, data: { path: [root.id] } });

  console.warn(`  Seeded the org tree's one root unit: "${BRAND.identity.name}".`);
}

/**
 * Seeds the accounts the posting rules (WO-19.2) and the year-end close
 * (WO-19.5) resolve by code —
 * `chart-of-accounts.ts`'s `CHART_OF_ACCOUNTS`. Runs unconditionally, the
 * same as every other reference-data seed here, even when `accounting` is
 * off in MODULES: the rows are inert until a posting rule looks one up, and
 * seeding them only on toggle-on would mean the first sale after turning
 * accounting on has nothing to post to.
 *
 * Only `name` is re-asserted on a re-run — never `type`/`isBank`/`isControl`,
 * which are structural and, once an accounts-admin screen exists, editable —
 * the same "label always upserts, structure never gets reset" split
 * `seedPermissions()` already uses for grants.
 */
async function seedChartOfAccounts(): Promise<void> {
  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: { name: account.name },
      create: account,
    });
  }
}

/**
 * WO-23.1 — categories are seed data, not a setting (staff edit them as
 * rows from the admin UI once seeded). `isDirect: true` on exactly
 * packaging/courier_charges/gateway_fees: they scale with orders and sit
 * above the gross-profit line with COGS, everything else sits below it.
 * Upsert on `key` keeps ids stable across re-runs.
 */
async function seedExpenseCategories(): Promise<void> {
  const categories: Array<{ key: string; name: string; isDirect: boolean; order: number }> = [
    { key: 'rent', name: 'Rent', isDirect: false, order: 0 },
    { key: 'salaries', name: 'Salaries', isDirect: false, order: 1 },
    { key: 'utilities', name: 'Utilities', isDirect: false, order: 2 },
    { key: 'marketing', name: 'Marketing', isDirect: false, order: 3 },
    { key: 'transport', name: 'Transport', isDirect: false, order: 4 },
    { key: 'packaging', name: 'Packaging', isDirect: true, order: 5 },
    { key: 'courier_charges', name: 'Courier charges', isDirect: true, order: 6 },
    { key: 'gateway_fees', name: 'Payment gateway fees', isDirect: true, order: 7 },
    { key: 'equipment_rent', name: 'Equipment rent', isDirect: false, order: 8 },
    { key: 'repairs', name: 'Repairs', isDirect: false, order: 9 },
    { key: 'misc', name: 'Miscellaneous', isDirect: false, order: 10 },
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { key: category.key },
      update: { name: category.name, isDirect: category.isDirect, order: category.order },
      create: category,
    });
  }
}

/**
 * WO-6.6 — "reason codes are a seeded, editable list, not free text: they
 * are the input to the fit-feedback loop in Phase 9." Upsert on `key` keeps
 * ids stable across re-runs, same idiom as seedExpenseCategories() above.
 */
async function seedReturnReasons(): Promise<void> {
  const reasons: Array<{ key: string; order: number; labelEn: string; labelAr: string }> = [
    { key: 'too_small', order: 0, labelEn: 'Too small', labelAr: 'صغير جدًا' },
    { key: 'too_big', order: 1, labelEn: 'Too big', labelAr: 'كبير جدًا' },
    { key: 'damaged', order: 2, labelEn: 'Arrived damaged', labelAr: 'وصل تالفًا' },
    { key: 'not_as_described', order: 3, labelEn: 'Not as described', labelAr: 'لا يطابق الوصف' },
    { key: 'wrong_item', order: 4, labelEn: 'Wrong item received', labelAr: 'وصلت قطعة خاطئة' },
    { key: 'quality_issue', order: 5, labelEn: 'Quality issue', labelAr: 'مشكلة في الجودة' },
    { key: 'changed_mind', order: 6, labelEn: 'Changed my mind', labelAr: 'غيّرتُ رأيي' },
    { key: 'late_delivery', order: 7, labelEn: 'Arrived too late', labelAr: 'وصل متأخرًا' },
    { key: 'other', order: 8, labelEn: 'Other', labelAr: 'أخرى' },
  ];

  for (const reason of reasons) {
    const record = await prisma.returnReasonCode.upsert({
      where: { key: reason.key },
      update: { order: reason.order },
      create: { key: reason.key, order: reason.order },
    });
    for (const [locale, label] of [
      ['en', reason.labelEn],
      [SECOND_LOCALE, reason.labelAr],
    ] as const) {
      await prisma.returnReasonTranslation.upsert({
        where: { reasonId_locale: { reasonId: record.id, locale } },
        update: { label },
        create: { reasonId: record.id, locale, label },
      });
    }
  }
}

/**
 * Upserts a seeded user by EITHER its email or its phone.
 *
 * Both columns are unique, and the seed hard-codes a phone per role. Keying
 * only on email meant that renaming a seeded account — `staff@yaseen.pk` to a
 * real person's address, say — made the seed look for an email that no longer
 * exists, try to CREATE the user, and collide on a phone the renamed row
 * still holds:
 *
 *   Unique constraint failed on the fields: (`phone`)
 *
 * That is not recoverable by re-running, and it aborts the whole seed, so
 * every later step (reference data, and on a fresh database the permission
 * catalog) never runs.
 *
 * Matching on either identifier makes it idempotent against a database whose
 * accounts have since been edited. An existing row keeps its email, phone,
 * name and password — only `role` is asserted, which is the one thing the
 * seed is responsible for. Nothing here ever resets a live user's password.
 */
async function upsertSeedUser(input: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'STAFF' | 'TAILOR' | 'CUSTOMER';
  /** CUSTOMER is left alone if it already exists; staff roles are asserted. */
  assertRole?: boolean;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });

  if (existing) {
    if (!input.assertRole || existing.role === input.role) return existing;
    return prisma.user.update({
      where: { id: existing.id },
      data: { role: input.role },
    });
  }

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hash(input.password, 12),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      phone: input.phone,
    },
  });
}

async function seedUsers() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@roya.example';
  // A default password is a development convenience only. In production a seed
  // that falls back to "admin12345" would ship a known credential.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (IS_PRODUCTION ? undefined : 'admin12345');
  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD must be set when seeding production.');
  }

  const admin = await upsertSeedUser({
    email: adminEmail,
    phone: '+971500000001',
    password: adminPassword,
    firstName: 'Atelier',
    lastName: 'Admin',
    role: 'ADMIN',
    assertRole: true,
  });

  // Demo accounts exist for local development and never in production.
  if (IS_PRODUCTION) return { admin };

  const staff = await upsertSeedUser({
    email: 'staff@roya.example',
    phone: '+971500000002',
    password: 'staff12345',
    firstName: 'Staff',
    lastName: 'Member',
    role: 'STAFF',
    assertRole: true,
  });

  const seamstress = await upsertSeedUser({
    email: 'seamstress@roya.example',
    phone: '+971500000003',
    password: 'seamstress12345',
    firstName: 'Atelier',
    lastName: 'Seamstress',
    role: 'TAILOR',
    assertRole: true,
  });
  await prisma.tailorProfile.upsert({
    where: { userId: seamstress.id },
    update: {},
    create: {
      userId: seamstress.id,
      displayName: 'Atelier Seamstress',
      phone: '+971500000003',
      specialties: [GOWN.key],
      capacityPerWeek: 5,
    },
  });

  // The design's own sample client is "Mariam". The surname is a placeholder.
  const customer = await upsertSeedUser({
    email: 'mariam@example.com',
    phone: '+971500000004',
    password: 'customer12345',
    firstName: 'Mariam',
    lastName: 'Demo',
    role: 'CUSTOMER',
  });
  await prisma.address.createMany({
    data: [
      {
        userId: customer.id,
        label: 'Home',
        fullName: 'Mariam Demo',
        phone: '+971500000004',
        line1: 'Villa 12',
        line2: 'Emirates Hills',
        // `city` decides the shipping zone, so it carries the emirate.
        city: 'Dubai',
        province: 'Dubai',
        isDefault: true,
      },
    ],
    skipDuplicates: true,
  });

  return { admin, staff, seamstress, customer };
}

/**
 * The gown's measurement fields, in centimetres: what the atelier takes at a
 * first fitting and keeps on file. Stitching (the Blueprint's "your cloth, our
 * tailors" flow) is switched off for it: ROYA makes the gown, the customer does
 * not bring fabric.
 */
async function seedGown(): Promise<void> {
  const record = await prisma.garmentType.upsert({
    where: { key: GOWN.key },
    update: {},
    create: {
      key: GOWN.key,
      labelEn: GOWN.label.en,
      labelUr: GOWN.label.ar,
      order: 0,
      stitchingPrice: 0,
      stitchingEnabled: false,
    },
  });

  for (const [order, field] of GOWN.fields.entries()) {
    await prisma.measurementField.upsert({
      where: { garmentTypeId_key: { garmentTypeId: record.id, key: field.key } },
      update: {},
      create: {
        garmentTypeId: record.id,
        key: field.key,
        labelEn: field.en,
        labelUr: field.ar,
        unit: 'CM',
        min: field.min,
        max: field.max,
        required: true,
        order,
      },
    });
  }
}

async function seedCategories(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();

  for (const definition of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      update: {},
      create: { slug: definition.slug, order: definition.order },
    });
    for (const [locale, name] of [
      ['en', definition.name.en],
      [SECOND_LOCALE, definition.name.ar],
    ] as const) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        update: {},
        create: { categoryId: category.id, locale, name },
      });
    }
    bySlug.set(definition.slug, category.id);
  }

  return bySlug;
}

/** The shop's own label, as a Brand row, so seeded products take the same path the back office does. */
async function houseBrandId(): Promise<string> {
  const slug = 'roya';
  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) return existing.id;

  const brand = await prisma.brand.create({
    data: {
      slug,
      translations: {
        create: [
          { locale: 'en', name: BRAND.identity.shortName },
          { locale: SECOND_LOCALE, name: BRAND.identity.nameUr },
        ],
      },
    },
  });
  return brand.id;
}

/** SKU: MEHR-IVORY-FR-34. Stable and readable, never regenerated once created. */
function buildSku(slug: string, shade: string, fit: string): string {
  return [slug, shade, fit]
    .map((part) => part.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .join('-')
    .slice(0, 60);
}

/** Which sizes a piece is offered in: a commission adds "made to measure", an accessory is one size. */
function fitsFor(product: RoyaProduct): string[] {
  if (product.type === 'accessory') return ['One size'];
  if (product.type === 'bespoke') return [MADE_TO_MEASURE, ...ATELIER_SIZES];
  return [...ATELIER_SIZES];
}

async function seedCatalogue(categories: Map<string, string>): Promise<void> {
  const brandId = await houseBrandId();
  const gown = await prisma.garmentType.findUnique({ where: { key: GOWN.key } });

  for (const definition of PRODUCTS) {
    const price = toMinor(definition.priceMajor);
    const product = await prisma.product.upsert({
      where: { slug: definition.slug },
      update: {},
      create: {
        slug: definition.slug,
        // STITCHED is the Blueprint's "finished garment", and it is the kind the
        // default storefront listing browses (catalog.service.ts buildWhere): a
        // plain GOODS product is hidden from it unless asked for by kind.
        kind: 'STITCHED',
        status: 'ACTIVE',
        categoryId: categories.get(definition.categorySlug),
        basePrice: price,
        brandId,
        // The storefront reads a piece's type from its tags (roya-data.ts).
        tags: definition.type === 'ready-to-wear' ? [] : [definition.type === 'bespoke' ? 'bespoke' : 'accessory'],
        featuredRank: definition.featuredRank,
        publishedAt: new Date(),
      },
    });

    for (const [locale, copy] of [
      ['en', 'en'],
      [SECOND_LOCALE, 'ar'],
    ] as const) {
      const sections = [
        definition.intro[copy],
        `## ${SECTION_TITLES[copy].details}\n\n${definition.details[copy]}`,
        `## ${SECTION_TITLES[copy].craft}\n\n${definition.craft[copy]}`,
      ].join('\n\n');
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale } },
        update: {},
        create: {
          productId: product.id,
          locale,
          name: definition.name[copy],
          description: sections,
          careInstructions: definition.care[copy],
          metaDescription: definition.blurb[copy],
        },
      });
    }

    // Stock starts at zero on purpose: ROYA makes to order (the made-to-order
    // setting parks a line as a backorder until the piece is produced), and the
    // design gives no stock figures. The atelier records real stock.
    let order = 0;
    for (const shade of definition.shades) {
      for (const fit of fitsFor(definition)) {
        const sku = buildSku(definition.slug, shade.name, fit);
        await prisma.productVariant.upsert({
          where: { sku },
          update: {},
          create: {
            productId: product.id,
            sku,
            size: fit,
            color: shade.name,
            colorHex: shade.hex,
            stock: 0,
            order: order++,
            // A commission starts with its deposit; basePrice stays the full price.
            priceOverride: definition.type === 'bespoke' ? depositMinor(definition.priceMajor) : null,
          },
        });
      }
    }

    if (gown && definition.garmentKey) {
      await prisma.productGarmentType.upsert({
        where: { productId_garmentTypeId: { productId: product.id, garmentTypeId: gown.id } },
        update: {},
        create: { productId: product.id, garmentTypeId: gown.id },
      });
    }

    await seedMedia(product.id, definition);
  }
}

const SECTION_TITLES = {
  en: { details: 'The details', craft: 'Craftsmanship' },
  ar: { details: 'التفاصيل', craft: 'الحِرفية' },
} as const;

/** Attaches the gallery once. A product that already has any image is left alone: re-seeding never undoes the atelier's own photography. */
async function seedMedia(productId: string, definition: RoyaProduct): Promise<void> {
  if ((await prisma.productImage.count({ where: { productId } })) > 0) return;

  for (const [order, media] of definition.media.entries()) {
    const image = await prisma.productImage.create({
      data: { productId, url: media.url, alt: media.alt.en, order, isPrimary: order === 0 },
    });
    await prisma.productImageTranslation.create({
      data: { imageId: image.id, locale: SECOND_LOCALE, alt: media.alt.ar },
    });
  }
}

async function seedCollections(): Promise<void> {
  for (const definition of COLLECTIONS) {
    const collection = await prisma.collection.upsert({
      where: { slug: definition.slug },
      update: {},
      create: { slug: definition.slug, sortStrategy: 'MANUAL', isActive: true },
    });
    for (const [locale, name] of [
      ['en', definition.name.en],
      [SECOND_LOCALE, definition.name.ar],
    ] as const) {
      await prisma.collectionTranslation.upsert({
        where: { collectionId_locale: { collectionId: collection.id, locale } },
        update: {},
        create: { collectionId: collection.id, locale, name },
      });
    }

    const products = await prisma.product.findMany({
      where: { slug: { in: [...definition.members] } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(products.map((product) => [product.slug, product.id]));
    await prisma.collectionProduct.createMany({
      data: definition.members.flatMap((slug, order) => {
        const productId = idBySlug.get(slug);
        return productId ? [{ collectionId: collection.id, productId, order }] : [];
      }),
      skipDuplicates: true,
    });
  }
}

/**
 * The design's Delivery step: white-glove and collection inside the UAE, an
 * insured courier outside it. A zone matches on the address's city, which is
 * why the storefront sends the emirate as the city; the second zone is the
 * catch-all for everywhere else.
 */
async function seedShipping(): Promise<void> {
  const zoneIds = new Map<string, string>();
  for (const [order, zone] of SHIPPING.zones.entries()) {
    const record = await prisma.shippingZone.upsert({
      where: { key: zone.key },
      update: {},
      create: { key: zone.key, order, cities: [...zone.cities], isCatchAll: zone.isCatchAll },
    });
    zoneIds.set(zone.key, record.id);
    for (const [locale, label] of [
      ['en', zone.label.en],
      [SECOND_LOCALE, zone.label.ar],
    ] as const) {
      await prisma.shippingZoneTranslation.upsert({
        where: { zoneId_locale: { zoneId: record.id, locale } },
        update: {},
        create: { zoneId: record.id, locale, label },
      });
    }
  }

  const methodIds = new Map<string, string>();
  for (const [order, method] of SHIPPING.methods.entries()) {
    const record = await prisma.shippingMethod.upsert({
      where: { key: method.key },
      update: {},
      create: { key: method.key, order, etaMinDays: method.etaMinDays, etaMaxDays: method.etaMaxDays },
    });
    methodIds.set(method.key, record.id);
    for (const [locale, label] of [
      ['en', method.label.en],
      [SECOND_LOCALE, method.label.ar],
    ] as const) {
      await prisma.shippingMethodTranslation.upsert({
        where: { methodId_locale: { methodId: record.id, locale } },
        update: {},
        create: { methodId: record.id, locale, label },
      });
    }
  }

  for (const rate of SHIPPING.rates) {
    const zoneId = zoneIds.get(rate.zone)!;
    const methodId = methodIds.get(rate.method)!;
    if (await prisma.shippingRate.findFirst({ where: { zoneId, methodId } })) continue;
    await prisma.shippingRate.create({
      data: { zoneId, methodId, type: 'FLAT', fee: toMinor(rate.feeMajor) },
    });
  }
}

/** UAE VAT: one standard class at the brand's rate, in basis points. Prices are VAT-inclusive (see seedSettings). */
async function seedTax(): Promise<void> {
  const taxClass = await prisma.taxClass.upsert({
    where: { key: 'standard' },
    update: {},
    create: { key: 'standard', name: `Standard (${BRAND.commerce.vatPercent}% VAT)`, isDefault: true },
  });
  if ((await prisma.taxRate.count({ where: { taxClassId: taxClass.id } })) > 0) return;
  await prisma.taxRate.create({
    data: { taxClassId: taxClass.id, rateBps: BRAND.commerce.vatPercent * 100 },
  });
}

/** Creates a setting only when it has never been set, so a value an admin changed is never reset. */
async function ensureSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
}

async function seedSettings(): Promise<void> {
  // ROYA makes to order: a line with no stock is parked as a backorder until the
  // piece is produced, instead of being refused as "out of stock".
  await ensureSetting(SettingKey.OrdersAllowBackorder, true);
  // Prices are shown with 5% VAT included ("Includes 5% UAE VAT").
  await ensureSetting(SettingKey.TaxEnabled, true);
  await ensureSetting(SettingKey.TaxPricingMode, 'INCLUSIVE');
  await ensureSetting(SettingKey.TaxDefaultClass, 'standard');
  // The Blueprint's defaults are scaled for another market: a cash-on-delivery
  // fee of 100 and a minimum order of 500, in the shop's currency. ROYA takes
  // no cash on delivery and has accessories under 500.
  await ensureSetting(SettingKey.CodEnabled, false);
  await ensureSetting(SettingKey.MinOrderValue, 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
