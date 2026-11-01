import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { serializeRowMoney } from "@/lib/serialize-money";
import { serializeMoney, serializeRate } from "@repo/money";
import { availableFrom, inventorySelect } from "@repo/catalog";
import { can } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import ProductEditor from "./product-editor";
import type { EditorSpecGroup } from "./spec-editor";

/** SpecMeasurement columns are Decimal(14, 4); money's default scale is 2. */
const SPEC_SCALE = 4;

type Translated = { language: string };
const inLanguage = <T extends Translated>(rows: T[], language: string) => rows.find((row) => row.language === language);

/**
 * One spec group as the editor needs it: both languages side by side, and
 * every Decimal serialized to a string at this boundary (see @repo/money).
 */
function toEditorSpecGroup(group: {
  id: string;
  translations: (Translated & { name: string })[];
  items: {
    id: string;
    key: string | null;
    kind: string;
    unit: string | null;
    comparator: string;
    option: { key: string } | null;
    translations: (Translated & { label: string; value: string | null })[];
    measurements: {
      value: Parameters<typeof serializeMoney>[0];
      valueMax: Parameters<typeof serializeMoney>[0] | null;
      conditionValue: Parameters<typeof serializeMoney>[0] | null;
      conditionUnit: string | null;
    }[];
  }[];
}): EditorSpecGroup {
  return {
    id: group.id,
    name: { en: inLanguage(group.translations, "en")?.name ?? "", ar: inLanguage(group.translations, "ar")?.name ?? "" },
    items: group.items.map((item) => ({
      id: item.id,
      key: item.key,
      kind: item.kind as EditorSpecGroup["items"][number]["kind"],
      unit: item.unit,
      comparator: item.comparator as EditorSpecGroup["items"][number]["comparator"],
      optionKey: item.option?.key ?? null,
      label: {
        en: inLanguage(item.translations, "en")?.label ?? "",
        ar: inLanguage(item.translations, "ar")?.label ?? "",
      },
      text: {
        en: inLanguage(item.translations, "en")?.value ?? null,
        ar: inLanguage(item.translations, "ar")?.value ?? null,
      },
      measurements: item.measurements.map((m) => ({
        value: serializeMoney(m.value, SPEC_SCALE),
        valueMax: m.valueMax == null ? null : serializeMoney(m.valueMax, SPEC_SCALE),
        conditionValue: m.conditionValue == null ? null : serializeMoney(m.conditionValue, SPEC_SCALE),
        conditionUnit: m.conditionUnit,
      })),
    })),
  };
}

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

  const [product, categories, discounts, priceHistory, specVocabulary] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: "asc" } },
        variants: { include: { inventory: inventorySelect() } },
        category: true,
        lightingtype: true,
        translations: true,
        specGroups: {
          orderBy: { position: "asc" },
          include: {
            translations: true,
            items: {
              orderBy: { position: "asc" },
              include: {
                translations: true,
                measurements: { orderBy: { position: "asc" } },
                option: { select: { key: true } },
              },
            },
          },
        },
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
    // The shared vocabulary, so the spec editor can tell an existing entry
    // (already named in Arabic) from a new one that needs an Arabic name.
    prisma.specOption.findMany({
      orderBy: { key: "asc" },
      select: { key: true, translations: { select: { language: true, label: true } } },
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
        specGroups: product.specGroups.map(toEditorSpecGroup),
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
      specVocabulary={specVocabulary.map((option) => ({
        key: option.key,
        en: option.translations.find((t) => t.language === "en")?.label ?? option.key,
        ar: option.translations.find((t) => t.language === "ar")?.label ?? null,
      }))}
    />
  );
};

export default ProductDetailPage;
