import { requireAdmin, AdminAuthError } from "@/lib/auth";
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
        variants: true,
        category: true,
        lightingtype: true,
        translations: true,
        specifications: true,
      },
    }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] }),
    prisma.discount.findMany({
      where: { productId, isActive: true },
      orderBy: { createdAt: "desc" },
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
      product={product}
      topCategories={topCategories}
      childCategories={childCategories}
      discounts={discounts}
      priceHistory={priceHistory}
      isOwner={can(admin.role, "price:write")}
      storefrontUrl={storefrontUrlFor(product)}
    />
  );
};

export default ProductDetailPage;
