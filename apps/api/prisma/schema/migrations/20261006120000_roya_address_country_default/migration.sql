-- ROYA: an address belongs to the United Arab Emirates unless it says otherwise.
--
-- `Address.country` defaults to "PK" in the Blueprint's schema and the address
-- DTO has no country field, so every address a client saved would have been
-- stored as Pakistani. Only the DEFAULT changes; existing rows keep their value
-- (a fresh ROYA database has none). prisma/schema/core.prisma carries the same
-- default so `prisma migrate dev` sees no drift, and
-- apps/api/test/currency-defaults.spec.ts fails if an upgrade puts another back.

ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'AE';
