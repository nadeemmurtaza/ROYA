-- ROYA: the Blueprint's reference data carries Urdu text, and ROYA's second
-- language is Arabic. Three places hold it:
--
--   * LoyaltyTier.benefitDescriptionUr (20260924190000): the three starter tiers.
--   * ShippingZoneTranslation, locale 'ur' (20260924220000): the labels of the
--     Karachi, Punjab and Rest of Pakistan zones.
--   * ShippingMethodTranslation, locale 'ur' (20260924220000): the "standard"
--     method's label.
--
-- Nothing is deleted. Each row is rewritten in place, and only while it still
-- holds the exact Urdu text the Blueprint seeded, so a row someone has since
-- edited is left alone. The shipping rows belong to zones and a method that
-- 20261005120000 already deactivated; they change from locale 'ur' to 'ar' so
-- that, if one is ever reactivated, its Arabic label is the one shown. A row is
-- skipped, not overwritten, if its zone or method already has an Arabic label.
--
-- The column names (benefitDescriptionUr, labelUr and the rest) are not touched:
-- they hold whatever the brand's second language is (docs/ENGINE-FORKS.md, row 2).
--
-- Idempotent: after the first run no row matches, so running it again changes
-- nothing. apps/api/test/second-language-data.spec.ts fails if Urdu comes back.

UPDATE "LoyaltyTier"
SET "benefitDescriptionUr" = 'اكسبوا نقاطًا على كل طلب يتم تسليمه.'
WHERE "id" = 'loyalty-tier-bronze'
  AND "benefitDescriptionUr" = 'ہر مکمل آرڈر پر پوائنٹس حاصل کریں۔';

UPDATE "LoyaltyTier"
SET "benefitDescriptionUr" = 'اكسبوا نقاطًا على كل طلب يتم تسليمه، مع وصول مبكر إلى التخفيضات.'
WHERE "id" = 'loyalty-tier-silver'
  AND "benefitDescriptionUr" = 'ہر مکمل آرڈر پر پوائنٹس، اور سیل تک جلد رسائی۔';

UPDATE "LoyaltyTier"
SET "benefitDescriptionUr" = 'اكسبوا نقاطًا على كل طلب يتم تسليمه، مع وصول مبكر إلى التخفيضات وشحن مجاني.'
WHERE "id" = 'loyalty-tier-gold'
  AND "benefitDescriptionUr" = 'ہر مکمل آرڈر پر پوائنٹس، سیل تک جلد رسائی، اور مفت شپنگ۔';

UPDATE "ShippingZoneTranslation" AS t
SET "locale" = 'ar', "label" = v."arabic"
FROM (VALUES
  ('szonetr_karachi_ur', 'szone_karachi', 'کراچی', 'كراتشي'),
  ('szonetr_punjab_ur', 'szone_punjab', 'پنجاب و اسلام آباد', 'البنجاب وإسلام آباد'),
  ('szonetr_rop_ur', 'szone_rest_of_pakistan', 'باقی پاکستان', 'باقي باكستان')
) AS v("id", "zoneId", "urdu", "arabic")
WHERE t."id" = v."id"
  AND t."locale" = 'ur'
  AND t."label" = v."urdu"
  AND NOT EXISTS (
    SELECT 1 FROM "ShippingZoneTranslation" o WHERE o."zoneId" = v."zoneId" AND o."locale" = 'ar'
  );

UPDATE "ShippingMethodTranslation" AS t
SET "locale" = 'ar', "label" = 'توصيل عادي'
WHERE t."id" = 'smethodtr_standard_ur'
  AND t."locale" = 'ur'
  AND t."label" = 'معیاری ترسیل'
  AND NOT EXISTS (
    SELECT 1 FROM "ShippingMethodTranslation" o WHERE o."methodId" = 'smethod_standard' AND o."locale" = 'ar'
  );
