"use server";  
import { prisma } from "@repo/database";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { serializeRowMoney } from "@/lib/serialize-money";
import { familiesMatching, productBulbSelect, productDiscountRates } from "@repo/catalog";
import { bulbChoices } from "@repo/catalog/bulb-pricing";
import { localizeSpecGroups, specGroupSelect } from "@/lib/spec-groups";

/**
 * A result is rendered as a product card, and a card generates its own
 * description — so the locale comes in: the specs have to be localized on
 * the way out, or every search result opens with a generic noun.
 */
export async function searchProducts(searchItem: string, locale = "en") {
  // sectionType is an enum: it is matched against whole families whose slug
  // contains the term, not with a `contains` the column cannot take.
  const families = familiesMatching(searchItem);

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { productName: { contains: searchItem, mode: "insensitive" } },
        { brand: { contains: searchItem, mode: "insensitive" } },
        ...(families.length ? [{ sectionType: { in: families } }] : []),
      ],
    },
    select: {
      id: true,
      productId: true,
      productName: true,
      price: true,
      brand: true,
      sectionType: true,
      spotlightType: true,
      images: productImageSelect(),
      categoryId: true,
      lightingtypeId: true,
      hNumber: true,
      specGroups: specGroupSelect(locale),
      bulbs: productBulbSelect(),
      lightingtype: { include: { translations: { where: { language: locale }, take: 1 } } },
    },
    take: 10,
  });
  const rates = await productDiscountRates(products, prisma);

  // Money leaves the server as strings: a Prisma.Decimal cannot be passed
  // to a Client Component (see @repo/money).
  return products.map((product) => ({
    ...serializeRowMoney(product),
    // The ProductImage table, not the legacy array — see lib/product-images.
    productImages: imageUrls(product),
    // From the engine, so search results agree with the product page.
    discount: rates[product.id] ?? "0.0000",
    // What the card's description is built from; see @repo/catalog/describe.
    specGroups: localizeSpecGroups(product.specGroups ?? [], locale),
    bulbChoices: bulbChoices(product.bulbs, product.hNumber, locale),
    lightingTypeName:
      product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? undefined,
  }));
}
