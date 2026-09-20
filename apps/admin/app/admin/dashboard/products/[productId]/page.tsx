import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { serializeRowMoney } from "@/lib/serialize-money";
import { serializeMoney, serializeRate } from "@repo/money";
import { availableFrom, inventorySelect } from "@repo/catalog";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import ProductEditor from "./product-editor";

/**
 * Builds the public product URL, mirroring the storefront route
 * /category/[brand]/[subCategory]/[lightingType]/[ProductId]. Returns null
 * when a piece is missing, so the header simply drops the link.
 */
function storefrontUrlFor(product: {
  brand: string;
  sectionType: string | null;
  spotlightType: string | null;
  productId: string;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://artlighting-eg.com";
  if (!product.brand || !product.sectionType || !product.spotlightType) return null;
  return `${base.replace(/\/$/, "")}/category/${product.brand}/${product.sectionType}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`;
}

const ProductDetailPage = async ({
  params,
}: {
  params: Promise<{ productId: string }>;
}) => {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) return notFound();
    throw err;
  }

  const { productId } = await params;

  const [product, categories, discounts, priceHistory] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: "asc" } },
        variants: { include: { inventory: inventorySelect() } },
        category: true,
        lightingtype: true,
        translations: true,
        specifications: true,
      },
    }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] }),
    // Every discount that covers this product, through the join table.
    prisma.discount.findMany({
      where: { isActive: true, products: { some: { productId } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, type: true, rate: true, amount: true, code: true },
    }),
    prisma.priceHistory.findMany({
      where: { productId },
      orderBy: { changedAt: "desc" },
      take: 10,
    }),
  ]);

  if (!product) return notFound();

  const topCategories = categories.filter((c) => c.parentId === null);
  const childCategories = categories.filter((c) => c.parentId !== null);

  return (
    <ProductEditor
      product={{
        ...serializeRowMoney(product),
        // Relations are serialized explicitly: serializeRowMoney is shallow
        // on purpose, so nothing is converted by accident. `stock` is not a
        // column any more — it is what the ledger says is sellable.
        variants: product.variants.map((variant) => ({
          ...serializeRowMoney(variant),
          stock: availableFrom(variant.inventory),
        })),
      }}
      topCategories={topCategories}
      childCategories={childCategories}
      // A rate and an amount are separate columns now, each with one
      // meaning; both are serialized at this boundary.
      discounts={discounts.map((discount) => ({
        ...discount,
        rate: discount.rate == null ? null : serializeRate(discount.rate),
        amount: discount.amount == null ? null : serializeMoney(discount.amount),
      }))}
      priceHistory={priceHistory.map(serializeRowMoney)}
      isOwner={can(admin.role, "price:write")}
      storefrontUrl={storefrontUrlFor(product)}
    />
  );
};

export default ProductDetailPage;
