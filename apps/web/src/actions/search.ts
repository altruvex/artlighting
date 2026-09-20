"use server";  
import { prisma } from "@repo/database";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { serializeRowMoney } from "@/lib/serialize-money";
import { productDiscountRates } from "@repo/catalog";

export async function searchProducts(searchItem: string) {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { productName: { contains: searchItem, mode: "insensitive" } },
        { brand: { contains: searchItem, mode: "insensitive" } },
        { sectionType: { contains: searchItem, mode: "insensitive" } },
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
  }));
}
