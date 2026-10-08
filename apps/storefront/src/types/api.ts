/**
 * The shapes the API returns to the storefront, written out by hand from the
 * public endpoints (apps/api catalog, cart, orders). Only the fields the
 * storefront reads are listed; the API sends more.
 */

export interface ApiImage {
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface ApiVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  /** Integer fils. For a commission this is the deposit, not the full price. */
  price: number;
  stock: number;
  inStock: boolean;
}

export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
}

export interface ApiProduct {
  id: string;
  slug: string;
  kind: string;
  name: string;
  /** The intro paragraph, then optional `## ` sections. */
  description: string | null;
  careInstructions: string | null;
  /** Integer fils: the full price, even for a commission. */
  basePrice: number;
  compareAtPrice: number | null;
  tags: string[];
  images: ApiImage[];
  metaTitle: string | null;
  /** The one-line blurb a card shows. */
  metaDescription: string | null;
  variants: ApiVariant[];
  category: ApiCategory | null;
  inStock: boolean;
  fromPrice: number;
}

export interface Paged<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'featured' | 'name';

export interface ApiCollection {
  collection: { id: string; slug: string; name: string };
  productSlugs: string[];
  total: number;
}

export interface CartLine {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  variantId: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

export interface Cart {
  id: string;
  token: string;
  items: CartLine[];
  itemCount: number;
  totals: { itemsSubtotal: number; stitchingSubtotal: number; grandTotal: number };
  issues: Array<{ lineId?: string; message?: string; code?: string }>;
}

export interface PaymentMethod {
  key: string;
  labelEn: string;
  labelUr: string;
  descriptionEn: string | null;
  descriptionUr: string | null;
}

/** What a placed order looks like when the API hands it back (POST /orders, /orders/:number, /orders/mine). */
export interface OrderLine {
  id: string;
  nameEn: string;
  /** The second language's name: the engine's column predates the second locale being configurable. */
  nameUr: string | null;
  sku: string;
  imageUrl: string | null;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** The VAT already inside this line, in fils. Order-level `taxAmount` is not filled in; sum these. */
  taxAmount: number;
}

export interface BankAccount {
  bank: string;
  title: string;
  accountNumber: string;
  iban: string;
}

export interface OrderPayment {
  paymentId: string;
  /** Set when the method is a hosted gateway: send the customer there to pay. */
  redirectUrl: string | null;
  meta?: { accounts?: BankAccount[] } | null;
}

/** One payment as the order lists it, newest first. */
export interface OrderPaymentRow {
  id: string;
  provider: string;
  status: string;
  receiptUrl: string | null;
  meta?: { accounts?: BankAccount[] } | null;
}

export interface Order {
  id: string;
  number: string;
  status: string;
  currency: string;
  guestName: string | null;
  guestEmail: string | null;
  shippingAddress: Record<string, string | null> | null;
  itemsSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  shippingZone: string | null;
  customerNote: string | null;
  placedAt: string;
  items: OrderLine[];
  /** Present on the response to placing the order only. */
  payment?: OrderPayment;
  /** On every later read of the order: its payments, newest first. */
  payments?: OrderPaymentRow[];
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  /** The permission keys the account holds. Sign-in and refresh send them; `/auth/me` does not. The desk reads them to decide what to show; the API still decides what is allowed. */
  permissions?: string[];
}

export interface WishlistItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  variantId: string | null;
  variantLabel: string | null;
  inStock: boolean;
  createdAt: string;
}

export interface ShippingOption {
  zoneKey: string;
  methodKey: string;
  label: string;
  /** Fils. */
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
}

// ── The atelier desk (admin endpoints) ──────────────────────────────────────

export interface AdminPayment {
  id: string;
  orderId: string;
  /** `bank_transfer`, `cod`, `account`… */
  provider: string;
  status: string;
  /** Integer fils. */
  amount: number;
  currency: string;
  reference: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  createdAt: string;
}

/** A payment waiting on a person, with the little of its order the list needs. */
export interface PaymentToConfirm extends AdminPayment {
  order: { id: string; number: string; guestName: string | null; grandTotal: number; placedAt: string };
}

export interface AdminShipment {
  id: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  dispatchedAt: string | null;
}

export interface OrderStatusEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  number: string;
  status: string;
  channel: string;
  currency: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  shippingAddress: Record<string, string | null> | null;
  itemsSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  shippingZone: string | null;
  customerNote: string | null;
  staffNote: string | null;
  cancelReason: string | null;
  placedAt: string;
  items: OrderLine[];
  payments: AdminPayment[];
  shipments: AdminShipment[];
  statusEvents: OrderStatusEvent[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';
  lostReason: string | null;
  createdAt: string;
}
