import { DynamicModule, Logger, Module, type Type } from '@nestjs/common';
import { AccountingModule } from './money/accounting/accounting.module';
import { AddressesModule } from './sales/addresses/addresses.module';
import { CartModule } from './sales/cart/cart.module';
import { CatalogModule } from './merchandising/catalog/catalog.module';
import { CollectionsModule } from './merchandising/collections/collections.module';
import { ContentModule } from './merchandising/content/content.module';
import { CrmModule } from './customers/crm/crm.module';
import { CustomFieldsModule } from './merchandising/custom-fields/custom-fields.module';
import { EmbedsModule } from './merchandising/embeds/embeds.module';
import { EntityAttributesModule } from './merchandising/entity-attributes/entity-attributes.module';
import { FeatureFlagsAdminModule } from './system/feature-flags/feature-flags-admin.module';
import { FragmentsModule } from './merchandising/fragments/fragments.module';
import { MetadataFormsModule } from './merchandising/metadata-forms/metadata-forms.module';
import { BpmnWorkflowsModule } from './system/bpmn-workflows/bpmn-workflows.module';
import { FulfilmentModule } from './sales/fulfilment/fulfilment.module';
import { GiftCardsModule } from './sales/giftcards/giftcards.module';
import { NotifyModule } from './customers/notify/notify.module';
import { InventoryModule } from './supply-chain/inventory/inventory.module';
import { MarketingModule } from './merchandising/marketing/marketing.module';
import { MeasurementsModule } from './sales/measurements/measurements.module';
import { NotificationPreferencesModule } from './customers/notification-preferences/notification-preferences.module';
import { OrdersModule } from './sales/orders/orders.module';
import { PartiesModule } from './customers/parties/parties.module';
import { PaymentsModule } from './sales/payments/payments.module';
import { PricingModule } from './sales/pricing/pricing.module';
import { PlanningModule } from './supply-chain/planning/planning.module';
import { PromotionsModule } from './sales/promotions/promotions.module';
import { ReceivablesModule } from './money/receivables/receivables.module';
import { ResilienceAdminModule } from './supply-chain/resilience/resilience-admin.module';
import { SearchModule } from './merchandising/search/search.module';
import { SettingsAdminModule } from './system/settings/settings-admin.module';
import { StitchingModule } from './sales/stitching/stitching.module';
import { TaxModule } from './money/tax/tax.module';
import { TrackingModule } from './sales/tracking/tracking.module';
import { UsersAdminModule } from './system/users/users-admin.module';
import { WishlistModule } from './sales/wishlist/wishlist.module';

export interface FeatureModuleEntry {
  /** Matches an entry in the MODULES env allowlist. */
  name: string;
  module: Type<unknown>;
  /** Ignores the allowlist; use only for modules the store cannot run without. */
  alwaysOn?: boolean;
  /**
   * Registered, but deliberately NOT enabled in any env template.
   *
   * States in code what the comments below already said in prose, so
   * `scripts/check-env-templates.mjs` can tell "nobody has switched this on
   * yet, on purpose" apart from "somebody forgot to add it to a template" —
   * which is the drift that check exists to catch. Without the distinction it
   * can only demand every module be enabled everywhere, and satisfying it
   * would turn on the chain and GL features that RETAIL-ERP.md R14 requires
   * to stay invisible in a Solo deployment.
   *
   * A template may still list one under `# Available:` so a deployer can
   * discover it; the check requires exactly that.
   */
  offByDefault?: boolean;
}

/**
 * The registry of feature modules.
 *
 * ADDING A MODULE IS ONE LINE HERE. Nothing else in the API changes: the module
 * owns its controllers, services and its own prisma/schema/<name>.prisma file,
 * and it reaches other modules through domain events rather than imports.
 * See CONTRIBUTING.md.
 */
export const FEATURE_MODULES: FeatureModuleEntry[] = [
  { name: 'catalog', module: CatalogModule },
  { name: 'content', module: ContentModule },
  { name: 'collections', module: CollectionsModule },
  { name: 'search', module: SearchModule },
  { name: 'measurements', module: MeasurementsModule },
  { name: 'cart', module: CartModule },
  { name: 'stitching', module: StitchingModule },
  { name: 'inventory', module: InventoryModule },
  { name: 'parties', module: PartiesModule },
  { name: 'payments', module: PaymentsModule },
  { name: 'orders', module: OrdersModule },
  { name: 'crm', module: CrmModule },
  { name: 'marketing', module: MarketingModule },
  { name: 'tax', module: TaxModule },
  // 145-receivables-credit-limits-dunning.md — CreditNote/DebitNote, customer
  // credit limits/holds and dunning. Posts through domain events only
  // (CreditNoteIssued/DebitNoteIssued -> posting-rules.subscriber.ts), so it
  // never imports AccountingModule directly; with `accounting` off, notes and
  // credit terms still work as records, they just post nothing (same "absent
  // collaborator" shape as every other event-only coupling in this file).
  { name: 'receivables', module: ReceivablesModule },
  // 146-wholesale-tiered-pricing.md — the pricing module MULTI-SECTOR.md
  // already named as not built. Hard-imported by cart/orders directly (same
  // shape as tax below) so checkout can always resolve PricingService; this
  // allowlist entry only gates the admin nav/UI, per pricing.module.ts's
  // own doc comment.
  { name: 'pricing', module: PricingModule },
  // Hard-imported by orders.module.ts directly (same reasoning as tax
  // above — checkout always needs ShippingService.quote()), but still
  // listed here so its own admin routes/nav follow the allowlist like
  // every other module's.
  { name: 'fulfilment', module: FulfilmentModule },
  // tasks-notifications-support/24-internal-notifications-meetings-escalation.md
  // — imports no other module (reads hr's/orgstructure's/tasks's own
  // tables directly by Prisma query), same no-dependency-on-either-being-on
  // shape as `attendance`/`tasks` just above.
  { name: 'notify', module: NotifyModule },
  // Same allowlist tier as payments/finance (not offByDefault): checkout
  // couples to both directly, in the same transaction as order creation
  // (`orders -> promotions`, `orders -> giftcards` in KNOWN_MODULE_COUPLINGS)
  // — see DECISIONS.md. "A shop may want one without the other" (WO-5's own
  // words) is a DATA decision (no active Discount rows, no issued
  // GiftCards), not a Nest-boot-time module toggle.
  { name: 'promotions', module: PromotionsModule },
  { name: 'giftcards', module: GiftCardsModule },
  { name: 'wishlist', module: WishlistModule },
  { name: 'notification-preferences', module: NotificationPreferencesModule },
  { name: 'tracking', module: TrackingModule },
  // Off by default — a deployment turns it on once it wants a real GL
  // instead of the sum-of-tables reports in `finance`/`reports`. Couples to
  // nothing either way (R15): no module imports AccountingModule, and its
  // posting rules (WO-19.2/19.3) reach `orders`/`payments`/`purchasing` only
  // through domain events, never a service import.
  { name: 'accounting', module: AccountingModule, offByDefault: true },
  // Account administration — not togglable business features.
  { name: 'settings', module: SettingsAdminModule, alwaysOn: true },
  { name: 'users', module: UsersAdminModule, alwaysOn: true },
  { name: 'addresses', module: AddressesModule, alwaysOn: true },
  // 104-jsonb-eav-extensibility.md — a bounded custom-field overlay, not a
  // sector-specific pack.
  { name: 'custom-fields', module: CustomFieldsModule, alwaysOn: true },
  // 113-micro-frontend-embedding.md — a narrow iframe embed pattern.
  { name: 'embeds', module: EmbedsModule, alwaysOn: true },
  // 144-supply-chain-resilience-planning-engine.md — a pure read/
  // recommendation engine over rows every other module already writes; a
  // deployment gains nothing by running without it.
  { name: 'planning', module: PlanningModule, alwaysOn: true },
  // 140-general-eav-extensibility-model.md — a general EAV model, built by
  // explicit owner override (ADR-026).
  { name: 'entity-attributes', module: EntityAttributesModule, alwaysOn: true },
  // 143-micro-frontend-architecture.md — micro-frontend fragments, built by
  // explicit owner override (ADR-026); the mount mechanism is doc 113's own
  // iframe + embed-token pattern (see DECISIONS.md ADR-049), not literal
  // module federation.
  { name: 'fragments', module: FragmentsModule, alwaysOn: true },
  // 141-general-metadata-driven-ui-engine.md — a general metadata-driven UI
  // engine, built by explicit owner override (ADR-026).
  { name: 'metadata-forms', module: MetadataFormsModule, alwaysOn: true },
  // 142-bpmn-visual-workflow-engine.md — a BPMN visual workflow engine over
  // doc 63's own ApprovalChain, built by explicit owner override (ADR-026).
  { name: 'bpmn-workflows', module: BpmnWorkflowsModule, alwaysOn: true },
  // 37-scalability-future-upgrades.md (WO-37.2/37.5) — the admin CRUD
  // surface over FeatureFlag. FeatureFlagsService.isEnabled() itself lives
  // in core/feature-flags (always available, like SettingsService); this
  // entry only gates the admin controller/nav, the same "settings" shape
  // above. A deployment gains nothing by running without it — a flag with
  // no rows behaves exactly as if this were off (doc 37's own "absent
  // collaborator" lens).
  { name: 'feature-flags', module: FeatureFlagsAdminModule, alwaysOn: true },
  // 38-resilience-engineering.md — the admin read/tune surface over
  // CircuitBreakerService (core/resilience) and SloRecorderService
  // (core/slo), both already global and always available regardless of
  // this entry — the same "this only gates the admin controller/nav"
  // shape `feature-flags` establishes just above.
  { name: 'resilience', module: ResilienceAdminModule, alwaysOn: true }
];

/**
 * Composes the enabled modules into one import.
 *
 * The allowlist is read from process.env rather than ConfigService because
 * module composition happens before the DI container exists. env.validation.ts
 * still validates the same variable at boot.
 */
@Module({})
export class FeatureModulesModule {
  static register(): DynamicModule {
    const logger = new Logger('FeatureModules');
    const allowlist = (process.env.MODULES ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const enabled = FEATURE_MODULES.filter(
      (entry) => entry.alwaysOn || allowlist.includes(entry.name),
    );

    const skipped = FEATURE_MODULES.filter((entry) => !enabled.includes(entry));
    logger.log(`Enabled modules: ${enabled.map((e) => e.name).join(', ') || 'none'}`);
    if (skipped.length > 0) {
      logger.log(`Disabled by MODULES allowlist: ${skipped.map((e) => e.name).join(', ')}`);
    }

    return {
      module: FeatureModulesModule,
      imports: enabled.map((entry) => entry.module),
    };
  }
}
