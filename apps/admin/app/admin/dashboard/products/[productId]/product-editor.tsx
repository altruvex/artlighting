"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageIcon,
  Loader2Icon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateProductGeneral,
  updateProductPrice,
  softDeleteProduct,
  restoreProduct,
  duplicateProduct,
  addProductImage,
  uploadProductImage,
  removeProductImage,
  setPrimaryImage,
  reorderProductImages,
  updateVariant,
  upsertProductTranslation,
  upsertProductSpecification,
  type ProductSpecificationInput,
} from "@/lib/actions/products";
import { createDiscount, deactivateDiscount } from "@/lib/actions/discounts";
import type { ActionResult } from "@/lib/actions/result";

type Category = { id: string; name: string; parentId: string | null };
type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  order: number;
  isPrimary: boolean;
};
type Variant = {
  id: string;
  sku: string;
  wattage: string | null;
  finish: string | null;
  size: string | null;
  stock: number;
  priceOverride: number | null;
  isDefault: boolean;
};
type Discount = {
  id: string;
  type: string;
  scope: string;
  value: number;
  code: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};
type PriceHistoryEntry = {
  id: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: Date;
};
type Translation = { language: string; name: string; description: string | null };
type Specification = ProductSpecificationInput & { language: string };

/** Runs a server action, then toasts and refreshes. */
type Run = (fn: () => Promise<ActionResult<unknown>>, successMsg: string) => void;

const BRANDS = [
  { value: "balcom", label: "Balcom" },
  { value: "mister-led", label: "Mister LED" },
];
const PRODUCT_COLORS = ["warm", "cool", "white"] as const;
const PRODUCT_IPS = ["IP20", "IP44", "IP54", "IP65", "IP68"] as const;
const PRODUCT_CHAND_LAMPS = ["lamp9w", "lamp12w"] as const;
// Each language is labelled in its own script, like the language switcher:
// an endonym is findable whatever the UI language is set to.
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
] as const;

// Labels live in messages under ProductEditor.specFields.<key>.
const SPEC_FIELDS: { key: keyof ProductSpecificationInput }[] = [
  { key: "input" },
  { key: "maximumWattage" },
  { key: "brandOfLed" },
  { key: "luminousFlux" },
  { key: "mainMaterial" },
  { key: "cri" },
  { key: "beamAngle" },
  { key: "workingTemperature" },
  { key: "fixtureDimmable" },
  { key: "electrical" },
  { key: "powerFactor" },
  { key: "colorTemperature" },
  { key: "ip" },
  { key: "energySaving" },
  { key: "lifeTime" },
  { key: "finish" },
  { key: "lampBase" },
  { key: "bulb" },
];

const MONEY = { style: "currency", currency: "EGP" } as const;

interface Props {
  product: {
    id: string;
    productId: string;
    productName: string;
    brand: string;
    price: number;
    isActive: boolean;
    featured: boolean;
    deletedAt: Date | null;
    categoryId: string;
    lightingtypeId: string;
    maxIP: number | null;
    hNumber: number | null;
    chandelierLightingType: string | null;
    specSheetUrl: string | null;
    productColor: string;
    productIp: string;
    productChandLamp: string;
    images: ProductImage[];
    variants: Variant[];
    translations: Translation[];
    specifications: Specification[];
  };
  topCategories: Category[];
  childCategories: Category[];
  discounts: Discount[];
  priceHistory: PriceHistoryEntry[];
  isOwner: boolean;
  /** Absolute storefront URL, or null when the product isn't linkable yet. */
  storefrontUrl: string | null;
}

/**
 * ERP record page for one product: header with the record's identity and
 * record-level actions, a main column of content sections, an aside for
 * commercial/meta data, and a sticky bar for the primary save.
 *
 * Saving is per section (each section maps to its own server action); the
 * sticky bar saves the "details" set — general fields, visibility and the
 * datasheet link — which share one form state.
 */
export default function ProductEditor({
  product,
  topCategories,
  childCategories,
  discounts,
  priceHistory,
  isOwner,
  storefrontUrl,
}: Props) {
  const t = useTranslations("ProductEditor");
  const tProducts = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fieldId = useId();

  const [productName, setProductName] = useState(product.productName);
  const [brand, setBrand] = useState(product.brand);
  const [isActive, setIsActive] = useState(product.isActive);
  const [featured, setFeatured] = useState(product.featured);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [lightingtypeId, setLightingtypeId] = useState(product.lightingtypeId);
  const [productColor, setProductColor] = useState(product.productColor);
  const [productIp, setProductIp] = useState(product.productIp);
  const [productChandLamp, setProductChandLamp] = useState(product.productChandLamp);
  const [maxIP, setMaxIP] = useState(product.maxIP?.toString() ?? "");
  const [hNumber, setHNumber] = useState(product.hNumber?.toString() ?? "");
  const [chandelierLightingType, setChandelierLightingType] = useState(
    product.chandelierLightingType ?? ""
  );
  const [specSheetUrl, setSpecSheetUrl] = useState(product.specSheetUrl ?? "");

  const [priceInput, setPriceInput] = useState(String(product.price));

  const [newImageUrl, setNewImageUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountScope, setDiscountScope] = useState<"product" | "category" | "global">(
    "product"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const availableChildren = childCategories.filter((c) => c.parentId === categoryId);
  const isDeleted = product.deletedAt !== null;

  const details = useMemo(
    () => ({
      productName,
      brand,
      isActive,
      featured,
      categoryId,
      lightingtypeId,
      productColor,
      productIp,
      productChandLamp,
      maxIP,
      hNumber,
      chandelierLightingType,
      specSheetUrl,
    }),
    [
      productName,
      brand,
      isActive,
      featured,
      categoryId,
      lightingtypeId,
      productColor,
      productIp,
      productChandLamp,
      maxIP,
      hNumber,
      chandelierLightingType,
      specSheetUrl,
    ]
  );

  const savedDetails = useMemo(
    () => ({
      productName: product.productName,
      brand: product.brand,
      isActive: product.isActive,
      featured: product.featured,
      categoryId: product.categoryId,
      lightingtypeId: product.lightingtypeId,
      productColor: product.productColor,
      productIp: product.productIp,
      productChandLamp: product.productChandLamp,
      maxIP: product.maxIP?.toString() ?? "",
      hNumber: product.hNumber?.toString() ?? "",
      chandelierLightingType: product.chandelierLightingType ?? "",
      specSheetUrl: product.specSheetUrl ?? "",
    }),
    [product]
  );

  const isDirty = useMemo(
    () =>
      (Object.keys(savedDetails) as (keyof typeof savedDetails)[]).some(
        (key) => details[key] !== savedDetails[key]
      ),
    [details, savedDetails]
  );

  function discardDetails() {
    setProductName(savedDetails.productName);
    setBrand(savedDetails.brand);
    setIsActive(savedDetails.isActive);
    setFeatured(savedDetails.featured);
    setCategoryId(savedDetails.categoryId);
    setLightingtypeId(savedDetails.lightingtypeId);
    setProductColor(savedDetails.productColor);
    setProductIp(savedDetails.productIp);
    setProductChandLamp(savedDetails.productChandLamp);
    setMaxIP(savedDetails.maxIP);
    setHNumber(savedDetails.hNumber);
    setChandelierLightingType(savedDetails.chandelierLightingType);
    setSpecSheetUrl(savedDetails.specSheetUrl);
  }

  // Actions report failure in their return value: a thrown error loses its
  // message to an opaque digest in a production build, so the real reason
  // ("Price is owner-only", "File too large") only survives as `result.error`.
  const run: Run = (fn, successMsg) => {
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(successMsg);
        router.refresh();
      } catch (err) {
        // Only transport-level failures reach here now.
        console.error("Product action failed", err);
        toast.error(tCommon("genericError"));
      }
    });
  };

  function saveDetails() {
    run(
      () =>
        updateProductGeneral(product.id, {
          productName,
          brand,
          isActive,
          featured,
          categoryId,
          lightingtypeId,
          productColor: productColor as never,
          productIp: productIp as never,
          productChandLamp: productChandLamp as never,
          maxIP: maxIP ? Number(maxIP) : null,
          hNumber: hNumber ? Number(hNumber) : null,
          chandelierLightingType: chandelierLightingType || null,
          specSheetUrl: specSheetUrl || null,
        }),
      tCommon("saved")
    );
  }

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];

  return (
    <PageShell>
      <PageHeader
        title={product.productName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs" dir="ltr">
              {product.productId}
            </span>
            <StatusBadge tone={product.isActive ? "success" : "neutral"}>
              {product.isActive ? tCommon("active") : tCommon("inactive")}
            </StatusBadge>
            {product.featured && <StatusBadge tone="info">{tProducts("featured")}</StatusBadge>}
            {isDeleted && <StatusBadge tone="danger">{t("deleted")}</StatusBadge>}
          </span>
        }
        actions={
          <>
            {storefrontUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={storefrontUrl} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-4 rtl:-scale-x-100" aria-hidden />
                  {t("viewOnStorefront")}
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => duplicateProduct(product.id), t("toasts.duplicated"))}
            >
              {t("duplicate")}
            </Button>
            {isDeleted ? (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => run(() => restoreProduct(product.id), t("toasts.restored"))}
              >
                {t("restore")}
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmDelete(true)}
              >
                {tCommon("delete")}
              </Button>
            )}
          </>
        }
      />

      {isDeleted && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{t("deletedBanner.title")}</p>
          <p className="text-sm text-muted-foreground">{t("deletedBanner.description")}</p>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* ── Main column ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <Section title={t("general.title")} description={t("general.description")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={`${fieldId}-name`}
                className="sm:col-span-2"
                label={t("general.productName")}
                value={productName}
                onChange={setProductName}
              />

              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-sku`}>{t("general.sku")}</Label>
                <Input
                  id={`${fieldId}-sku`}
                  dir="ltr"
                  value={product.productId}
                  readOnly
                  aria-describedby={`${fieldId}-sku-hint`}
                  className="font-mono text-xs"
                />
                <p id={`${fieldId}-sku-hint`} className="text-xs text-muted-foreground">
                  {t("general.skuHint")}
                </p>
              </div>

              <SelectField
                id={`${fieldId}-brand`}
                label={t("general.brand")}
                value={brand}
                onValueChange={setBrand}
                options={BRANDS}
              />

              <SelectField
                id={`${fieldId}-category`}
                label={t("general.category")}
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  const firstChild = childCategories.find((c) => c.parentId === v);
                  if (firstChild) setLightingtypeId(firstChild.id);
                }}
                options={topCategories.map((c) => ({ value: c.id, label: c.name }))}
              />

              <SelectField
                id={`${fieldId}-subcategory`}
                label={t("general.subcategory")}
                value={lightingtypeId}
                onValueChange={setLightingtypeId}
                options={availableChildren.map((c) => ({ value: c.id, label: c.name }))}
              />

              <SelectField
                id={`${fieldId}-color`}
                label={t("general.colorTemperature")}
                value={productColor}
                onValueChange={setProductColor}
                options={PRODUCT_COLORS.map((c) => ({
                  value: c,
                  label: tProducts(`colorTemp.${c}`),
                }))}
              />

              <SelectField
                id={`${fieldId}-ip`}
                label={t("general.baseIp")}
                value={productIp}
                onValueChange={setProductIp}
                options={PRODUCT_IPS.map((ip) => ({ value: ip, label: ip }))}
              />

              <TextField
                id={`${fieldId}-maxip`}
                label={t("general.maxIp")}
                type="number"
                dir="ltr"
                placeholder={t("general.maxIpPlaceholder")}
                value={maxIP}
                onChange={setMaxIP}
              />
            </div>

            <Separator className="my-4" />

            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("general.chandelierGroup")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id={`${fieldId}-chandlamp`}
                label={t("general.chandLamp")}
                value={productChandLamp}
                onValueChange={setProductChandLamp}
                options={PRODUCT_CHAND_LAMPS.map((l) => ({
                  value: l,
                  label: tProducts(`chandLamp.${l}`),
                }))}
              />
              <TextField
                id={`${fieldId}-chandtype`}
                label={t("general.chandLightingType")}
                placeholder={t("general.chandLightingTypePlaceholder")}
                value={chandelierLightingType}
                onChange={setChandelierLightingType}
              />
              <TextField
                id={`${fieldId}-heads`}
                label={t("general.heads")}
                type="number"
                dir="ltr"
                value={hNumber}
                onChange={setHNumber}
              />
            </div>
          </Section>

          <Section title={t("translations.title")} description={t("translations.description")}>
            <Tabs defaultValue="en">
              <TabsList>
                {LANGUAGES.map((l) => (
                  <TabsTrigger key={l.value} value={l.value} lang={l.value}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LANGUAGES.map((l) => (
                <TabsContent key={l.value} value={l.value} className="pt-4">
                  <TranslationForm
                    language={l.value}
                    productCuid={product.id}
                    productSku={product.productId}
                    initial={product.translations.find((tr) => tr.language === l.value)}
                    isPending={isPending}
                    run={run}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </Section>

          <Section title={t("specifications.title")} description={t("specifications.description")}>
            <Tabs defaultValue="en">
              <TabsList>
                {LANGUAGES.map((l) => (
                  <TabsTrigger key={l.value} value={l.value} lang={l.value}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LANGUAGES.map((l) => (
                <TabsContent key={l.value} value={l.value} className="pt-4">
                  <SpecificationForm
                    language={l.value}
                    productCuid={product.id}
                    productSku={product.productId}
                    initial={product.specifications.find((s) => s.language === l.value)}
                    isPending={isPending}
                    run={run}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </Section>

          <Section
            title={t("images.title")}
            description={t("images.description")}
            action={
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("images.count", { count: product.images.length })}
              </span>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ImageUploadDropzone
                  productId={product.id}
                  productSku={product.productId}
                  isPending={isPending}
                  run={run}
                />
                <div className="space-y-1.5">
                  <Label htmlFor={`${fieldId}-imageurl`}>{t("images.urlLabel")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${fieldId}-imageurl`}
                      dir="ltr"
                      placeholder={t("images.urlPlaceholder")}
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={isPending || !newImageUrl}
                      onClick={() =>
                        run(async () => {
                          const result = await addProductImage(
                            product.id,
                            newImageUrl,
                            product.productName
                          );
                          // Keep the URL in the field when it failed, so the
                          // admin can fix it rather than paste it again.
                          if (result.ok) setNewImageUrl("");
                          return result;
                        }, t("images.added"))
                      }
                    >
                      {t("images.addUrl")}
                    </Button>
                  </div>
                </div>
              </div>

              {product.images.length === 0 ? (
                <div className="rounded-lg border border-dashed">
                  <EmptyState
                    icon={ImageIcon}
                    title={t("images.empty")}
                    description={t("images.emptyDescription")}
                  />
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {product.images.map((img, index) => (
                    <li key={img.id} className="overflow-hidden rounded-lg border">
                      {/* Arbitrary external hosts: next/image would need each
                          one allow-listed, so a plain <img> stays correct. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.altText ?? ""}
                        className="h-28 w-full bg-muted object-cover"
                      />
                      <div className="flex items-center justify-between gap-1 border-t px-2 py-1.5">
                        {img.isPrimary ? (
                          <StatusBadge tone="info">{t("images.primary")}</StatusBadge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={isPending}
                            onClick={() =>
                              run(
                                () => setPrimaryImage(img.id, product.id),
                                t("images.primarySet")
                              )
                            }
                          >
                            <StarIcon className="size-3.5" aria-hidden />
                            {t("images.setPrimary")}
                          </Button>
                        )}
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={t("images.moveUpNamed", { position: index + 1 })}
                            disabled={isPending || index === 0}
                            onClick={() => {
                              const order = product.images.map((i) => i.id);
                              [order[index - 1], order[index]] = [order[index], order[index - 1]];
                              run(
                                () => reorderProductImages(product.id, order),
                                t("images.reordered")
                              );
                            }}
                          >
                            <ChevronUpIcon className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={t("images.moveDownNamed", { position: index + 1 })}
                            disabled={isPending || index === product.images.length - 1}
                            onClick={() => {
                              const order = product.images.map((i) => i.id);
                              [order[index + 1], order[index]] = [order[index], order[index + 1]];
                              run(
                                () => reorderProductImages(product.id, order),
                                t("images.reordered")
                              );
                            }}
                          >
                            <ChevronDownIcon className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            aria-label={t("images.removeNamed", { position: index + 1 })}
                            disabled={isPending}
                            onClick={() =>
                              run(
                                () => removeProductImage(img.id, product.id),
                                t("images.removed")
                              )
                            }
                          >
                            <Trash2Icon className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <Section
            title={t("variants.title")}
            description={t("variants.description")}
            action={
              defaultVariant && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("variants.stock")}: {format.number(defaultVariant.stock)}
                </span>
              )
            }
          >
            {product.variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("variants.empty")}</p>
            ) : (
              <div className="space-y-3">
                {product.variants.map((variant) => (
                  <VariantRow
                    key={variant.id}
                    variant={variant}
                    productId={product.id}
                    isPending={isPending}
                    run={run}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Aside ───────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <Section title={t("visibility.title")} description={t("visibility.description")}>
            <div className="space-y-3">
              <ToggleRow
                label={t("visibility.activeLabel")}
                hint={t("visibility.activeHint")}
                pressed={isActive}
                onPressedChange={setIsActive}
                onLabel={tCommon("active")}
                offLabel={tCommon("inactive")}
              />
              <Separator />
              <ToggleRow
                label={t("visibility.featuredLabel")}
                hint={t("visibility.featuredHint")}
                pressed={featured}
                onPressedChange={setFeatured}
                onLabel={t("general.featured")}
                offLabel={t("general.notFeatured")}
              />
            </div>
          </Section>

          <Section title={t("pricing.title")}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-price`}>{t("pricing.price")}</Label>
                <div className="flex gap-2">
                  <Input
                    id={`${fieldId}-price`}
                    type="number"
                    dir="ltr"
                    inputMode="decimal"
                    className="tabular-nums"
                    value={priceInput}
                    disabled={!isOwner}
                    aria-describedby={isOwner ? undefined : `${fieldId}-price-hint`}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                  <Button
                    disabled={isPending || !isOwner}
                    onClick={() =>
                      run(
                        () => updateProductPrice(product.id, Number(priceInput)),
                        t("pricing.updated")
                      )
                    }
                  >
                    {t("pricing.update")}
                  </Button>
                </div>
                {!isOwner && (
                  <p id={`${fieldId}-price-hint`} className="text-xs text-muted-foreground">
                    {t("pricing.ownerOnly")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium">{t("pricing.history")}</p>
                <p className="text-xs text-muted-foreground">{t("pricing.historyDescription")}</p>
                {priceHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("pricing.noHistory")}</p>
                ) : (
                  <ul className="mt-2 divide-y rounded-lg border">
                    {priceHistory.map((h) => (
                      <li key={h.id} className="px-3 py-2">
                        <p className="flex items-center gap-1.5 text-sm tabular-nums">
                          <span className="text-muted-foreground line-through">
                            {format.number(h.oldPrice, MONEY)}
                          </span>
                          <ArrowRightIcon
                            className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100"
                            aria-hidden
                          />
                          <span className="font-medium">{format.number(h.newPrice, MONEY)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format.dateTime(new Date(h.changedAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <Section title={t("discounts.title")}>
            <div className="space-y-4">
              {!isOwner ? (
                <p className="text-sm text-muted-foreground">{t("discounts.ownerOnly")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    id={`${fieldId}-dtype`}
                    label={t("discounts.type")}
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                    options={[
                      { value: "percentage", label: t("discounts.percentage") },
                      { value: "fixed", label: t("discounts.fixed") },
                    ]}
                  />
                  <SelectField
                    id={`${fieldId}-dscope`}
                    label={t("discounts.scope")}
                    value={discountScope}
                    onValueChange={(v) =>
                      setDiscountScope(v as "product" | "category" | "global")
                    }
                    options={[
                      { value: "product", label: t("discounts.scopeProduct") },
                      { value: "category", label: t("discounts.scopeCategory") },
                      { value: "global", label: t("discounts.scopeGlobal") },
                    ]}
                  />
                  <TextField
                    id={`${fieldId}-dvalue`}
                    label={t("discounts.value")}
                    type="number"
                    dir="ltr"
                    inputClassName="tabular-nums"
                    value={discountValue}
                    onChange={setDiscountValue}
                  />
                  <TextField
                    id={`${fieldId}-dcode`}
                    label={t("discounts.code")}
                    dir="ltr"
                    value={discountCode}
                    onChange={setDiscountCode}
                  />
                  <Button
                    className="sm:col-span-2"
                    disabled={isPending || !discountValue}
                    onClick={() =>
                      run(
                        () =>
                          createDiscount({
                            type: discountType,
                            scope: discountScope,
                            value: Number(discountValue),
                            code: discountCode || null,
                            productId: discountScope === "product" ? product.id : null,
                            categoryId: discountScope === "category" ? categoryId : null,
                          }),
                        t("discounts.created")
                      )
                    }
                  >
                    {t("discounts.create")}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("discounts.activeTitle")}</p>
                {discounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("discounts.none")}</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {discounts.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 text-sm">
                          {d.type === "percentage"
                            ? t("discounts.percentOff", { value: d.value })
                            : t("discounts.amountOff", {
                                amount: format.number(d.value, MONEY),
                              })}
                          {d.code ? ` — ${t("discounts.withCode", { code: d.code })}` : ""}
                        </span>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 px-2 text-xs"
                            disabled={isPending}
                            onClick={() =>
                              run(() => deactivateDiscount(d.id), t("discounts.deactivated"))
                            }
                          >
                            {t("discounts.deactivate")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <Section title={t("datasheet.title")} description={t("datasheet.description")}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/products/${product.id}/datasheet?format=pptx`}>
                    <DownloadIcon className="size-4" aria-hidden />
                    {t("datasheet.downloadPptx")}
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/products/${product.id}/datasheet?format=pdf`}>
                    <DownloadIcon className="size-4" aria-hidden />
                    {t("datasheet.downloadPdf")}
                  </a>
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-specsheet`}>{t("general.datasheetUrl")}</Label>
                <Input
                  id={`${fieldId}-specsheet`}
                  dir="ltr"
                  placeholder={t("general.datasheetUrlPlaceholder")}
                  aria-describedby={`${fieldId}-specsheet-hint`}
                  value={specSheetUrl}
                  onChange={(e) => setSpecSheetUrl(e.target.value)}
                />
                <p id={`${fieldId}-specsheet-hint`} className="text-xs text-muted-foreground">
                  {t("general.datasheetUrlHint")}
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ── Sticky save bar ───────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t bg-background px-4 py-3 md:-mx-6 md:-mb-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            className={cn("text-sm", isDirty ? "text-foreground" : "text-muted-foreground")}
          >
            {isDirty ? t("saveBar.unsaved") : t("saveBar.saved")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || isPending}
              onClick={discardDetails}
            >
              {t("saveBar.discard")}
            </Button>
            <Button size="sm" disabled={!isDirty || isPending} onClick={saveDetails}>
              {isPending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
              {isPending ? tCommon("saving") : t("general.saveChanges")}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => run(() => softDeleteProduct(product.id), t("toasts.deleted"))}
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

/** Bordered record section: heading strip and body. */
function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type,
  dir,
  placeholder,
  hint,
  className,
  inputClassName,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "ltr";
  placeholder?: string;
  hint?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        dir={dir}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(type === "number" && "tabular-nums", inputClassName)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Two-state switch rendered as a button pair, so the state is readable
 * without colour and the label stays associated with the control.
 */
function ToggleRow({
  label,
  hint,
  pressed,
  onPressedChange,
  onLabel,
  offLabel,
}: {
  label: string;
  hint: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground text-pretty">{hint}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={pressed ? "default" : "outline"}
        aria-pressed={pressed}
        className="shrink-0"
        onClick={() => onPressedChange(!pressed)}
      >
        {pressed ? onLabel : offLabel}
      </Button>
    </div>
  );
}

function TranslationForm({
  language,
  productCuid,
  productSku,
  initial,
  isPending,
  run,
}: {
  language: string;
  productCuid: string;
  productSku: string;
  initial: Translation | undefined;
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations("ProductEditor.translations");
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-name`}>{t("name", { language })}</Label>
        <Input
          id={`${fieldId}-name`}
          lang={language}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-description`}>{t("descriptionLabel", { language })}</Label>
        <Textarea
          id={`${fieldId}-description`}
          lang={language}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        {!initial && <p className="text-xs text-muted-foreground">{t("missing")}</p>}
        <Button
          size="sm"
          className="ms-auto"
          disabled={isPending || !name}
          onClick={() =>
            run(
              () =>
                upsertProductTranslation(productCuid, productSku, language as "en" | "ar", {
                  name,
                  description: description || null,
                }),
              t("saved", { language: language.toUpperCase() })
            )
          }
        >
          {isPending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
          {isPending ? tCommon("saving") : t("save", { language: language.toUpperCase() })}
        </Button>
      </div>
    </div>
  );
}

function SpecificationForm({
  language,
  productCuid,
  productSku,
  initial,
  isPending,
  run,
}: {
  language: string;
  productCuid: string;
  productSku: string;
  initial: Specification | undefined;
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations("ProductEditor");
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const [values, setValues] = useState<ProductSpecificationInput>(() => {
    const v: ProductSpecificationInput = {};
    for (const { key } of SPEC_FIELDS) {
      v[key] = initial?.[key] ?? "";
    }
    return v;
  });

  function setField(key: keyof ProductSpecificationInput, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SPEC_FIELDS.map(({ key }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${fieldId}-${key}`}>{t(`specFields.${key}`)}</Label>
            <Input
              id={`${fieldId}-${key}`}
              lang={language}
              value={values[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(
              () =>
                upsertProductSpecification(productCuid, productSku, language as "en" | "ar", {
                  ...values,
                  input: values.input || null,
                  maximumWattage: values.maximumWattage || null,
                  brandOfLed: values.brandOfLed || null,
                  luminousFlux: values.luminousFlux || null,
                  mainMaterial: values.mainMaterial || null,
                  cri: values.cri || null,
                  beamAngle: values.beamAngle || null,
                  workingTemperature: values.workingTemperature || null,
                  fixtureDimmable: values.fixtureDimmable || null,
                  electrical: values.electrical || null,
                  powerFactor: values.powerFactor || null,
                  colorTemperature: values.colorTemperature || null,
                  ip: values.ip || null,
                  energySaving: values.energySaving || null,
                  lifeTime: values.lifeTime || null,
                  finish: values.finish || null,
                  lampBase: values.lampBase || null,
                  bulb: values.bulb || null,
                }),
              t("specifications.saved", { language: language.toUpperCase() })
            )
          }
        >
          {isPending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
          {isPending
            ? tCommon("saving")
            : t("specifications.save", { language: language.toUpperCase() })}
        </Button>
      </div>
    </div>
  );
}

function ImageUploadDropzone({
  productId,
  productSku,
  isPending,
  run,
}: {
  productId: string;
  productSku: string;
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations("ProductEditor.images");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    setIsUploading(true);
    run(async () => {
      // Stop at the first rejected file and hand its reason back — otherwise a
      // rejected type or oversized file uploads nothing and says nothing.
      let last: ActionResult<unknown> = { ok: true, data: undefined };
      for (const file of list) {
        const formData = new FormData();
        formData.set("file", file);
        last = await uploadProductImage(productId, productSku, formData);
        if (!last.ok) return last;
      }
      return last;
    }, t("uploaded", { count: list.length }));
    setIsUploading(false);
  }

  const busy = isPending || isUploading;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        uploadFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-input",
        busy && "opacity-60"
      )}
    >
      <input
        ref={inputRef}
        id={`${productId}-image-file`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      {busy ? (
        <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden />
      ) : (
        <UploadIcon className="size-5 text-muted-foreground" aria-hidden />
      )}
      <Label htmlFor={`${productId}-image-file`} className="cursor-pointer text-sm">
        {busy ? t("uploading") : t("dropzone")}
      </Label>
    </div>
  );
}

function VariantRow({
  variant,
  productId,
  isPending,
  run,
}: {
  variant: Variant;
  productId: string;
  isPending: boolean;
  run: Run;
}) {
  const t = useTranslations("ProductEditor.variants");
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const [wattage, setWattage] = useState(variant.wattage ?? "");
  const [finish, setFinish] = useState(variant.finish ?? "");
  const [size, setSize] = useState(variant.size ?? "");
  const [stock, setStock] = useState(String(variant.stock));

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="truncate font-mono text-xs" dir="ltr">
          {variant.sku}
        </span>
        {variant.isDefault && <StatusBadge tone="info">{t("default")}</StatusBadge>}
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
        <TextField
          id={`${fieldId}-wattage`}
          label={t("wattage")}
          value={wattage}
          onChange={setWattage}
        />
        <TextField
          id={`${fieldId}-finish`}
          label={t("finish")}
          value={finish}
          onChange={setFinish}
        />
        <TextField id={`${fieldId}-size`} label={t("size")} value={size} onChange={setSize} />
        <TextField
          id={`${fieldId}-stock`}
          label={t("stock")}
          type="number"
          dir="ltr"
          value={stock}
          onChange={setStock}
        />
      </div>
      <div className="flex justify-end border-t px-3 py-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(
              () =>
                updateVariant(variant.id, productId, {
                  wattage: wattage || null,
                  finish: finish || null,
                  size: size || null,
                  stock: Number(stock),
                }),
              t("updated")
            )
          }
        >
          {isPending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
          {isPending ? tCommon("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
