/**
 * Every internal path the app links to, in one place.
 *
 * These were 32 string literals spread across the codebase, which is fine
 * until a route moves: renaming `/orders` then means grepping for a quoted
 * string and hoping every spelling was found, with a dead link as the only
 * symptom and no compile error anywhere.
 *
 * Admin paths are absolute and use `next/link`: the back office is English-only
 * and never locale-prefixed. The storefront is a different app (apps/storefront)
 * with its own routes, so none are listed here.
 *
 * Functions rather than template literals wherever a path takes an id, so the
 * call site cannot forget a segment or interpolate an object by accident.
 */

export const ROUTES = {
  admin: {
    dashboard: '/admin',
    /** The launchpad (launchpad-apps/232-launchpad-and-app-manifest.md). */
    launchpad: '/admin/launchpad',
    account: '/admin/account',
    /** Your own personal API keys (163-personal-api-keys.md). */
    accountApiKeys: '/admin/account/api-keys',
    login: '/admin/login',
    /** The manager action hub's overflow screen (admin-platform/44-manager-action-hub.md WO-44.4). */
    myActions: '/admin/my-actions',

    /** 61-policy-communications-bulletin.md WO-61.5. */
    bulletins: '/admin/bulletins',
    bulletinNew: '/admin/bulletins/new',

    /** 64-help-desk-support-ticketing.md WO-64.5. */
    supportTickets: '/admin/support/tickets',
    supportTicketNew: '/admin/support/tickets/new',
    supportTicket: (id: string) => `/admin/support/tickets/${id}`,
    supportCustomerTickets: '/admin/support/customer-tickets',
    supportCustomerTicket: (id: string) => `/admin/support/customer-tickets/${id}`,

    products: '/admin/products',
    productNew: '/admin/products/new',
    product: (id: string) => `/admin/products/${id}`,
    /** Retired hand-built page (10-admin-dashboard.md WO-D.3/E.2) — now the analytics report of the same data. */
    productInsights: '/admin/analytics/products/top-sellers',
    categories: '/admin/categories',
    brands: '/admin/brands',
    /** 150-product-kitting-bundles.md WO-150.6. */
    bundles: '/admin/bundles',
    optionTemplates: '/admin/options',
    seo: '/admin/seo',
    import: '/admin/import',

    orders: '/admin/orders',
    order: (id: string) => `/admin/orders/${id}`,
    payments: '/admin/payments',

    shipments: '/admin/fulfilment/shipments',
    manifests: '/admin/fulfilment/manifests',
    tracking: '/admin/fulfilment/tracking',
    rto: '/admin/fulfilment/rto',
    returns: '/admin/fulfilment/returns',
    return: (id: string) => `/admin/fulfilment/returns/${id}`,
    shippingSettings: '/admin/settings/shipping',

    finance: '/admin/finance',
    financeMargins: '/admin/finance/margins',
    financeCashFlow: '/admin/finance/cash-flow',
    financeUnitEconomics: '/admin/finance/unit-economics',
    financeExpenses: '/admin/finance/expenses',
    /** Bulk expense onboarding (admin-platform/72-fragmented-tool-consolidation-import.md WO-72.4). */
    financeExpensesImport: '/admin/finance/expenses/import',

    /** 04-finance.md WO-4.6. */
    fiscalPeriods: '/admin/accounting/fiscal-periods',

    /** 145-receivables-credit-limits-dunning.md. */
    creditNotes: '/admin/credit-notes',
    creditNoteNew: '/admin/credit-notes/new',
    creditNote: (id: string) => `/admin/credit-notes/${id}`,
    debitNotes: '/admin/debit-notes',
    debitNoteNew: '/admin/debit-notes/new',
    debitNote: (id: string) => `/admin/debit-notes/${id}`,
    creditTerms: '/admin/credit-terms',
    dunningPolicy: '/admin/dunning-policy',
    statements: '/admin/statements',

    /** 37-scalability-future-upgrades.md. */
    featureFlags: '/admin/feature-flags',
    featureFlag: (id: string) => `/admin/feature-flags/${id}`,

    /**
     * 38-resilience-engineering.md. Named distinctly from `resilience`
     * above (144-supply-chain-resilience-planning-engine.md's own,
     * unrelated "Resilience Planning" screen) — two different documents
     * both happened to pick the word "resilience," and the existing route
     * wins the shorter name since it shipped first.
     */
    platformResilience: '/admin/platform-resilience',

    bom: '/admin/bom',

    /** The card registry's own detail tree (10-admin-dashboard.md D3) — one catch-all route, 25 config objects, not 25 hand-rolled pages. */
    analytics: '/admin/analytics',
    analyticsReport: (slug: string) => `/admin/analytics/${slug}`,
    /** 113-micro-frontend-embedding.md — every active EmbeddedWidget, `analytics.view`. */
    embeds: '/admin/embeds',

    inventory: '/admin/inventory',
    inventoryCounts: '/admin/inventory/counts',
    inventoryReorder: '/admin/inventory/reorder',
    inventorySlowMovers: '/admin/inventory/slow-movers',
    /** Retired hand-built page (WO-D.4/E.2) — now the analytics report. */
    inventoryInsights: '/admin/analytics/inventory/valuation',
    /** 32-lots-batch-expiry-fefo.md. */
    lots: '/admin/inventory/lots',
    lot: (id: string) => `/admin/inventory/lots/${id}`,
    /** 158-serialized-unit-tracking.md. Keyed by serialNumber, not id — the API's own identifier for a unit. */
    serials: '/admin/inventory/serials',
    serial: (serialNumber: string) => `/admin/inventory/serials/${encodeURIComponent(serialNumber)}`,

    purchaseOrders: '/admin/purchase-orders',
    purchaseOrderNew: '/admin/purchase-orders/new',
    purchaseOrder: (id: string) => `/admin/purchase-orders/${id}`,
    purchaseOrderReceive: (id: string) => `/admin/purchase-orders/${id}/receive`,
    /** Retired hand-built page (WO-D.2/E.2) — now the analytics report. */
    purchasingSpend: '/admin/analytics/purchasing/spend',
    suppliers: '/admin/suppliers',
    /** 144-supply-chain-resilience-planning-engine.md. */
    resilience: '/admin/resilience',
    supplier: (id: string) => `/admin/suppliers/${id}`,

    /** 152-purchase-requisition.md. A request to buy, distinct from the PO it may become. */
    requisitions: '/admin/requisitions',
    requisitionNew: '/admin/requisitions/new',
    requisition: (id: string) => `/admin/requisitions/${id}`,

    /** 156-single-employee-branch-loss-prevention.md. */
    inventoryVariancesByShift: '/admin/inventory/variances/by-shift',
    spotChecks: '/admin/inventory/spot-checks',
    spotCheck: (id: string) => `/admin/inventory/spot-checks/${id}`,
    suspiciousTraffic: '/admin/analytics/suspicious-traffic',

    stitching: '/admin/stitching',
    stitchingBookings: '/admin/stitching/bookings',
    stitchingBooking: (id: string) => `/admin/stitching/bookings/${id}`,
    stitchingJob: (id: string) => `/admin/stitching/jobs/${id}`,
    /** Retired hand-built page (WO-D.6/E.2) — now the analytics report. */
    workshopInsights: '/admin/analytics/workshop/output',
    garments: '/admin/garments',
    garment: (id: string) => `/admin/garments/${id}`,
    designs: '/admin/designs',
    design: (id: string) => `/admin/designs/${id}`,

    contacts: '/admin/contacts',
    contactSearch: (q: string) => `/admin/contacts?q=${encodeURIComponent(q)}`,
    /** Bulk customer onboarding (admin-platform/72-fragmented-tool-consolidation-import.md WO-72.4). */
    contactsImport: '/admin/contacts/import',
    /** Retired hand-built page (WO-D.5/E.2) — now the analytics report. */
    customerInsights: '/admin/analytics/customers/overview',
    leads: '/admin/leads',
    inbox: '/admin/inbox',
    marketing: '/admin/marketing',
    content: '/admin/content',
    collections: '/admin/collections',
    search: '/admin/search',
    campaigns: '/admin/campaigns',
    campaign: (id: string) => `/admin/campaigns/${id}`,
    segments: '/admin/segments',
/** Retired hand-built tabbed page (E.2) — now the analytics report index. */
    insights: '/admin/analytics',
    /** Retired hand-built page (WO-D.1/E.2) — now the analytics report. */
    orderInsights: '/admin/analytics/orders/overview',
    reports: '/admin/reports',
    tax: '/admin/tax',
    settings: '/admin/settings',
    /** Single sign-on connections (161-sso-identity-federation.md) — `settings.sso.manage`. */
    ssoConnections: '/admin/settings/sso',
    /** `new` is a real id here: the editor route handles creating and editing. */
    ssoConnection: (id: string) => `/admin/settings/sso/${id}`,
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    /** Every account's API keys — read and revoke only, `users.manage`. */
    usersApiKeys: '/admin/users/api-keys',
    emailTemplates: '/admin/email-templates',
    emailAccounts: '/admin/email-accounts',
    /** `new` is a real id here: the editor route handles creating and editing. */
    emailAccount: (id: string) => `/admin/email-accounts/${id}`,

  },
} as const;
