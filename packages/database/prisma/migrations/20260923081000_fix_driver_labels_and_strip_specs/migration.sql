-- Catalogue data fixes (2026-09-23), confirmed by Ali. Idempotent: the dev
-- branch already had these applied by hand, and re-running changes nothing.

-- Driver labels: brand names in their own case, and Philips spelled right.
UPDATE "spec_option_translations" t SET "label" = 'Balcom Internal Driver'
  FROM "spec_options" o WHERE t."optionId" = o."id" AND o."key" = 'balcom_internal_driver' AND t."language" = 'en';
UPDATE "spec_option_translations" t SET "label" = 'Balcom External Driver'
  FROM "spec_options" o WHERE t."optionId" = o."id" AND o."key" = 'balcom_external_driver' AND t."language" = 'en';
UPDATE "spec_option_translations" t SET "label" = 'Philips External Driver'
  FROM "spec_options" o WHERE t."optionId" = o."id" AND o."key" = 'phillips_external_driver' AND t."language" = 'en';
UPDATE "spec_option_translations" t SET "label" = 'درايفر خارجي من فيليبس'
  FROM "spec_options" o WHERE t."optionId" = o."id" AND o."key" = 'phillips_external_driver' AND t."language" = 'ar';

-- The 12 V LED strips (jy-5050-12v-*) carried the spotlight template: mains
-- input, a die-cast body and a 53° beam. The code says 12 V; a strip is a
-- flexible PCB; the beam angle is not known, so it is removed, not guessed.
INSERT INTO "spec_options" ("id", "key", "createdAt", "updatedAt")
  VALUES ('opt_dc_12v', 'dc_12v', NOW(), NOW()), ('opt_flexible_pcb', 'flexible_pcb', NOW(), NOW())
  ON CONFLICT ("key") DO NOTHING;
INSERT INTO "spec_option_translations" ("id", "optionId", "language", "label")
  SELECT 'optt_' || o."key" || '_' || v.lang, o."id", v.lang, v.label
  FROM "spec_options" o
  JOIN (VALUES ('dc_12v', 'en', 'DC 12V'), ('dc_12v', 'ar', '١٢ فولت تيار مستمر'),
               ('flexible_pcb', 'en', 'Flexible PCB'), ('flexible_pcb', 'ar', 'لوحة PCB مرنة')) AS v(key, lang, label)
    ON v.key = o."key"
  ON CONFLICT ("optionId", "language") DO NOTHING;

UPDATE "spec_items" i SET "optionId" = (SELECT "id" FROM "spec_options" WHERE "key" = 'dc_12v')
  FROM "spec_groups" g, "products" p
  WHERE i."groupId" = g."id" AND g."productId" = p."id" AND p."productId" LIKE 'jy-5050-12v-%' AND i."key" = 'input';
UPDATE "spec_items" i SET "optionId" = (SELECT "id" FROM "spec_options" WHERE "key" = 'flexible_pcb')
  FROM "spec_groups" g, "products" p
  WHERE i."groupId" = g."id" AND g."productId" = p."id" AND p."productId" LIKE 'jy-5050-12v-%' AND i."key" = 'mainMaterial';
DELETE FROM "spec_items" i
  USING "spec_groups" g, "products" p
  WHERE i."groupId" = g."id" AND g."productId" = p."id" AND p."productId" LIKE 'jy-5050-12v-%' AND i."key" = 'beamAngle';
