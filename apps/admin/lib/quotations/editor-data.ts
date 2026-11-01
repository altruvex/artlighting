import "server-only";
import { prisma } from "@repo/database";
import { serializeMoney } from "@repo/money";
import type { CustomerOption, ProductOption } from "./view";

export function customerLabel(c: { name: string; companyName: string | null }): string {
  return c.companyName ? `${c.companyName} — ${c.name}` : c.name;
}

/**
 * What the product is, for a quotation line whose product has no written
 * description: "LED Flood Light · 100W · IP65". Most products' English name
 * is their code, so without this a customer read a column of codes.
 */
function lineSummary(p: {
  sectionType: string;
  lightingtype: { name: string; translations: { name: string }[] } | null;
  specGroups: { items: { key: string | null; measurements: { value: { toString(): string } }[] }[] }[];
}): string | null {
  const figure = (key: string) => {
    const value = p.specGroups.flatMap((g) => g.items).find((i) => i.key === key)?.measurements[0]?.value;
    return value === undefined ? null : Number(value.toString());
  };
  const type = p.lightingtype?.translations[0]?.name || p.lightingtype?.name || "";
  const watts = figure("maximumWattage");
  const ip = figure("ip");
  const parts = [
    type && (p.sectionType === "CHANDELIER" ? type : `LED ${type}`),
    watts ? `${watts}W` : null,
    ip ? `IP${ip}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Pickers for the editor. Product names and descriptions are the ENGLISH
 * translation, because the document they end up in is English (D11).
 */
export async function getQuotationEditorOptions(): Promise<{
  customers: CustomerOption[];
  products: ProductOption[];
}> {
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ orderBy: [{ companyName: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({
      where: { deletedAt: null, status: { not: "ARCHIVED" } },
      orderBy: { productId: "asc" },
      select: {
        id: true,
        productId: true,
        productName: true,
        price: true,
        sectionType: true,
        translations: { where: { language: "en" }, select: { name: true, description: true } },
        lightingtype: { select: { name: true, translations: { where: { language: "en" }, select: { name: true } } } },
        specGroups: {
          select: {
            items: {
              where: { key: { in: ["maximumWattage", "ip"] } },
              select: { key: true, measurements: { orderBy: { position: "asc" }, take: 1, select: { value: true } } },
            },
          },
        },
        images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1, select: { url: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          select: { id: true, sku: true, wattage: true, finish: true, size: true, price: true },
        },
      },
    }),
  ]);

  return {
    customers: customers.map((c) => ({
      id: c.id,
      label: customerLabel(c),
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      taxId: c.taxId,
    })),
    products: products.map((p) => ({
      id: p.id,
      sku: p.productId.toUpperCase(),
      name: p.translations[0]?.name || p.productName,
      description: p.translations[0]?.description?.trim() || lineSummary(p),
      imageUrl: p.images[0]?.url ?? null,
      price: serializeMoney(p.price),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        label: [v.wattage, v.finish, v.size].filter(Boolean).join(" · ") || v.sku,
        price: serializeMoney(v.price ?? p.price),
      })),
    })),
  };
}
