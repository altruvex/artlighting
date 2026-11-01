-- Re-apply 20260923081000_fix_driver_labels_and_strip_specs.
--
-- That migration fixes rows in spec_options / spec_items. On a database
-- whose spec groups were built by `backfill:specs` AFTER it ran (production,
-- 2026-11-01: the migration ran first, the backfill second, per the rollout
-- runbook), the backfill rebuilt the options from the legacy rows and
-- undid it — the driver labels went back to their old case and spelling,
-- and dc_12v / flexible_pcb were removed as unused.
--
-- The same statements again, so the fixes hold wherever the backfill ran
-- last. Idempotent: a no-op on the dev branch.

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
