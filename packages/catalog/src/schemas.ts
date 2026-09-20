import { money } from "@repo/money";
import { z } from "zod";

/**
 * Validation for every way a product can be written: the admin forms, the
 * Excel import and (from Phase 4) quotation write-back all parse through
 * these, so a rule lives in one place instead of three.
 */

/** A SKU as the catalogue actually stores it: lowercase, no spaces. */
export const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "sku_invalid_characters")
  .describe("lowercase letters, digits, dot, underscore and hyphen");

/**
 * Money as it is written: a string, so nothing passes through a float on
 * the way in. `@repo/money` decides what parses, and the scale is checked
 * rather than silently rounded, so an import row with three decimals is
 * reported instead of quietly changing the price.
 *
 * All the checks live in one `superRefine`, not a chain of `refine`s: zod
 * runs every refinement in a chain even after one fails, so a later check
 * would call `money("abc")` on a value already known to be unparseable and
 * throw out of the schema instead of returning an error.
 */
function decimalSchema({
  scale,
  max,
  allowAboveOne = true,
  prefix,
}: {
  scale: number;
  max: string;
  allowAboveOne?: boolean;
  prefix: string;
}) {
  return z
    .union([z.string().trim(), z.number()])
    .transform((value) => String(value))
    .superRefine((value, ctx) => {
      let parsed;
      try {
        parsed = money(value);
      } catch {
        ctx.addIssue({ code: "custom", message: `${prefix}_not_a_number` });
        return;
      }
      if (!parsed.isFinite()) {
        ctx.addIssue({ code: "custom", message: `${prefix}_not_a_number` });
        return;
      }
      if (parsed.decimalPlaces() > scale) {
        ctx.addIssue({ code: "custom", message: `${prefix}_more_than_${scale}_decimals` });
      }
      if (parsed.isNegative()) {
        ctx.addIssue({ code: "custom", message: `${prefix}_negative` });
      }
      if (parsed.greaterThanOrEqualTo(max) || (!allowAboveOne && parsed.greaterThan(1))) {
        ctx.addIssue({ code: "custom", message: `${prefix}_out_of_range` });
      }
    })
    .transform((value) => money(value).toFixed(scale));
}

export const moneySchema = decimalSchema({ scale: 2, max: "10000000000", prefix: "money" });

/** A discount rate, not a percent: 0.13 = 13%. Four decimals, as the column stores. */
export const rateSchema = decimalSchema({ scale: 4, max: "10000000000", allowAboveOne: false, prefix: "rate" });

export const stockSchema = z.number().int().min(0).max(1_000_000);

export const createProductSchema = z.object({
  productId: skuSchema,
  productName: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  sectionType: z.string().trim().min(1).max(80),
  spotlightType: z.string().trim().min(1).max(80),
  categoryId: z.string().min(1),
  lightingtypeId: z.string().min(1),
  price: moneySchema,
  stock: stockSchema.default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductGeneralSchema = z.object({
  productName: z.string().trim().min(1).max(200).optional(),
  brand: z.string().trim().min(1).max(80).optional(),
  sectionType: z.string().trim().min(1).max(80).optional(),
  spotlightType: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().min(1).optional(),
  lightingtypeId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
  maxIP: z.number().int().min(0).max(100).nullable().optional(),
  hNumber: z.number().int().min(0).max(1000).nullable().optional(),
  chandelierLightingType: z.string().trim().max(80).nullable().optional(),
});
export type UpdateProductGeneralInput = z.infer<typeof updateProductGeneralSchema>;

export const updateVariantSchema = z.object({
  sku: skuSchema.optional(),
  wattage: z.string().trim().max(80).nullable().optional(),
  finish: z.string().trim().max(80).nullable().optional(),
  size: z.string().trim().max(80).nullable().optional(),
  stock: stockSchema.optional(),
  priceOverride: moneySchema.nullable().optional(),
});
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

/**
 * One bulk price operation. `set` replaces the price; `increase`/`decrease`
 * move it by a percentage (a rate: 0.1 = 10%) or a fixed amount. The result
 * is clamped at zero and rounded once, in the service.
 */
export const bulkPriceOperationSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("set"), amount: moneySchema }),
  z.object({ mode: z.literal("increase_amount"), amount: moneySchema }),
  z.object({ mode: z.literal("decrease_amount"), amount: moneySchema }),
  z.object({ mode: z.literal("increase_percent"), rate: rateSchema }),
  z.object({ mode: z.literal("decrease_percent"), rate: rateSchema }),
]);
export type BulkPriceOperation = z.infer<typeof bulkPriceOperationSchema>;

/**
 * One row of an Excel import. Every field except the SKU is optional: an
 * import updates what the sheet says and leaves the rest alone, and it
 * never deletes.
 */
export const importRowSchema = z.object({
  sku: skuSchema,
  name_en: z.string().trim().min(1).max(200).optional(),
  name_ar: z.string().trim().min(1).max(200).optional(),
  description_en: z.string().trim().max(4000).optional(),
  description_ar: z.string().trim().max(4000).optional(),
  brand: z.string().trim().min(1).max(80).optional(),
  price: moneySchema.optional(),
  discount: rateSchema.optional(),
  stock: stockSchema.optional(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
});
export type ImportRow = z.infer<typeof importRowSchema>;
