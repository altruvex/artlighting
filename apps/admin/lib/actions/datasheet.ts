"use server";

import * as catalog from "@repo/catalog";
import { prisma } from "@repo/database";
import { requirePermission } from "@/lib/auth";
import { datasheetChangesSchema, type DatasheetChanges } from "@/lib/datasheet/draft-schema";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront";
import { ActionError, run } from "./result";

/**
 * "Save these changes to the product" from the datasheet studio. Declining
 * never calls this: the edits then live only in the file that was exported.
 * All of it lands in one go or none of it does.
 */
export async function saveDatasheetToProduct(productId: string, input: DatasheetChanges) {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("DatasheetStudio.errors");
    const parsed = datasheetChangesSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("invalid"));
    const changes = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, productName: true } });
    if (!product) throw new ActionError(t("notFound"));

    let written: Awaited<ReturnType<typeof catalog.applySpecEdits>>;
    try {
      written = await catalog.applySpecEdits(productId, changes.edits, changes.additions);
    } catch (error) {
      console.error("datasheet write-back failed", error);
      throw new ActionError(t("saveFailed"));
    }

    // Stored as the product's authored English description, which every
    // generated document prefers over the text composed from its specs.
    if (changes.description) {
      await prisma.productTranslation.upsert({
        where: { productId_language: { productId, language: "en" } },
        update: { description: changes.description },
        create: { productId, language: "en", name: product.productName, description: changes.description },
      });
    }

    revalidateStorefront();
    revalidatePath(`/dashboard/products/${productId}`);
    revalidatePath(`/dashboard/products/${productId}/datasheet`);
    return {
      arabicToReview: [...new Set(written.warnings.map((w) => w.label))],
      /** In the order of `additions`, so the studio can relink its new rows. */
      createdItemIds: written.createdItemIds,
    };
  });
}
