-- ROYA: the shop's currency is the dirham (AED), not the Blueprint's home
-- currency.
--
-- Eight columns default their `currency` to "PKR" in the Blueprint's schema, and
-- the code never sets it, relying on that default: every order and payment
-- would be stored as PKR next to dirham amounts. Prisma schema defaults are
-- literals (they cannot read BRAND.locale.currency), so the default is set here,
-- in the one place every write path passes through.
--
-- Only the DEFAULT changes. Rows that already exist keep their value (a fresh
-- ROYA database has none). prisma/schema/*.prisma carries the same default so
-- `prisma migrate dev` sees no drift, and apps/api/test/currency-defaults.spec.ts
-- fails if a later upgrade from the Blueprint puts a different one back.

ALTER TABLE "Expense"       ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "GiftCard"      ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "Order"         ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "Payment"       ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "Supplier"      ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "PurchaseOrder" ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "SupplierBill"  ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "WalletAccount" ALTER COLUMN "currency" SET DEFAULT 'AED';
