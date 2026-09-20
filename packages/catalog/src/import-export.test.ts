import { describe, expect, it } from "vitest";
import { PRODUCT_COLUMNS } from "./import-export";
import { importRowSchema } from "./schemas";

/**
 * planImport and applyImport both need a database, so they are exercised
 * against the dev branch by scripts rather than here. What is unit-testable
 * is the contract the sheet and the schema share.
 */
describe("the export columns and the import schema agree", () => {
  it("accepts every exported column and nothing else", () => {
    const schemaKeys = Object.keys(importRowSchema.shape);
    expect([...PRODUCT_COLUMNS].sort()).toEqual(schemaKeys.sort());
  });

  it("puts sku first, because that is what a row is matched by", () => {
    expect(PRODUCT_COLUMNS[0]).toBe("sku");
  });

  it("parses a row written the way Excel writes numbers", () => {
    // Excel hands back a number for a numeric cell, not the text typed in.
    const row = importRowSchema.parse({ sku: "jy-202-15w", price: 729, discount: 0.13, stock: 10 });
    expect(row.price).toBe("729.00");
    expect(row.discount).toBe("0.1300");
    expect(row.stock).toBe(10);
  });

  it("rejects a percentage typed as a whole number", () => {
    // 13 in the discount column would mean 1300%.
    expect(importRowSchema.safeParse({ sku: "jy-202-15w", discount: 13 }).success).toBe(false);
  });
});
