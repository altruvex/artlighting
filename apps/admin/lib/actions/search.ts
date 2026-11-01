"use server";

import { type Prisma, prisma } from "@repo/database";
import { serializeMoney } from "@repo/money";
import { getLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { customerOptionSelect, toCustomerOption, variantLabel } from "@/lib/quotations/editor-data";
import type { CustomerOption } from "@/lib/quotations/view";
import { run } from "./result";

/**
 * On-demand lookups for the admin's pickers. A picker asks for what the
 * admin has typed and gets one short page back, instead of the page shipping
 * every customer or product to the browser up front.
 */

/** One page of results; enough to find what you are looking for by typing more. */
const TAKE = 20;

function cleanQuery(q: string): string {
  return String(q ?? "").trim().slice(0, 100);
}

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Customers for the quotation editor, by name, company, phone or email. */
export async function searchCustomers(q: string) {
  return run(async (): Promise<CustomerOption[]> => {
    await requirePermission("quotation:write");
    const query = cleanQuery(q);
    const customers = await prisma.customer.findMany({
      where: query
        ? { OR: [{ name: contains(query) }, { companyName: contains(query) }, { phone: contains(query) }, { email: contains(query) }] }
        : undefined,
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      take: TAKE,
      select: customerOptionSelect,
    });
    return customers.map(toCustomerOption);
  });
}

export interface ProductHit {
  id: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  /** Serialized money. */
  price: string;
  /** Active variants, for the quotation picker only; empty otherwise. */
  variants: { id: string; sku: string; label: string; price: string }[];
}

/**
 * Products by code, name (either language) or variant SKU.
 *
 * "quotation": English names (the document is English), no archived
 * products, with each variant so one can be picked directly.
 * "discount": names in the admin's language, archived products included
 * (a discount can still name one), no variants.
 */
export async function searchProducts(q: string, purpose: "quotation" | "discount" = "discount") {
  return run(async (): Promise<ProductHit[]> => {
    const forQuotation = purpose === "quotation";
    await requirePermission(forQuotation ? "quotation:write" : "catalog:read");
    const query = cleanQuery(q);
    const language = forQuotation ? "en" : await getLocale();

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(forQuotation ? { status: { not: "ARCHIVED" as const } } : {}),
      ...(query
        ? {
            OR: [
              { productId: contains(query) },
              { productName: contains(query) },
              { translations: { some: { name: contains(query) } } },
              { variants: { some: { sku: contains(query) } } },
            ],
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: { productId: "asc" },
      take: TAKE,
      select: {
        id: true,
        productId: true,
        productName: true,
        price: true,
        translations: { where: { language }, select: { name: true } },
        images: forQuotation ? { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1, select: { url: true } } : false,
        variants: forQuotation
          ? {
              where: { isActive: true },
              orderBy: { position: "asc" },
              select: { id: true, sku: true, wattage: true, finish: true, size: true, price: true },
            }
          : false,
      },
    });

    return products.map((p) => ({
      id: p.id,
      sku: forQuotation ? p.productId.toUpperCase() : p.productId,
      name: p.translations[0]?.name || p.productName,
      imageUrl: p.images?.[0]?.url ?? null,
      price: serializeMoney(p.price),
      variants: (p.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        label: variantLabel(v),
        price: serializeMoney(v.price ?? p.price),
      })),
    }));
  });
}

/**
 * Labels for products already chosen (a discount's targets), so the form can
 * show them as chips without loading the catalogue.
 */
export async function productLabels(ids: string[]) {
  return run(async (): Promise<{ id: string; label: string; sku: string }[]> => {
    await requirePermission("catalog:read");
    const wanted = [...new Set((Array.isArray(ids) ? ids : []).filter((id): id is string => typeof id === "string"))].slice(0, 1000);
    if (wanted.length === 0) return [];
    const language = await getLocale();
    const products = await prisma.product.findMany({
      where: { id: { in: wanted } },
      select: { id: true, productId: true, productName: true, translations: { where: { language }, select: { name: true } } },
    });
    return products.map((p) => ({ id: p.id, label: p.translations[0]?.name || p.productName, sku: p.productId }));
  });
}
