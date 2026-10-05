-- ROYA: switch off the shipping reference data this schema inherits from the
-- Blueprint.
--
-- 20260924220000_add_fulfilment_shipping_returns seeds the Blueprint's home
-- market: the zones "karachi", "punjab" and "rest_of_pakistan" (a CATCH-ALL),
-- a "standard" method with Urdu labels, and rates in that market's currency.
-- On a UAE shop those would quote the wrong money, and the catch-all would
-- compete with the real one for every address outside the listed cities.
--
-- Deactivated, never deleted: it is reversible from the back office, it
-- rewrites no history, and a row someone has since edited is not lost. The
-- quote logic only reads active zones, methods and rates, so these rows are
-- inert. ROYA's own zones and methods are created by prisma/seed.ts.
--
-- Idempotent: running it again changes nothing.

UPDATE "ShippingRate"
SET "isActive" = false
WHERE "zoneId" IN (SELECT "id" FROM "ShippingZone" WHERE "key" IN ('karachi', 'punjab', 'rest_of_pakistan'))
   OR "methodId" IN (SELECT "id" FROM "ShippingMethod" WHERE "key" = 'standard');

UPDATE "ShippingZone"
SET "isActive" = false
WHERE "key" IN ('karachi', 'punjab', 'rest_of_pakistan');

UPDATE "ShippingMethod"
SET "isActive" = false
WHERE "key" = 'standard';
