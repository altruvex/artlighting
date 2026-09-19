"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Loader2, Download } from "lucide-react";
import {
  updateProductGeneral,
  updateProductPrice,
  softDeleteProduct,
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

const BRANDS = [
  { value: "balcom", label: "Balcom" },
  { value: "mister-led", label: "Mister LED" },
];
const PRODUCT_COLORS = ["warm", "cool", "white"] as const;
const PRODUCT_IPS = ["IP20", "IP44", "IP54", "IP65", "IP68"] as const;
const PRODUCT_CHAND_LAMPS = ["lamp9w", "lamp12w"] as const;
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

interface Props {
  product: {
    id: string;
    productId: string;
    productName: string;
    brand: string;
    price: number;
    isActive: boolean;
    featured: boolean;
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
}

export default function ProductEditor({
  product,
  topCategories,
  childCategories,
  discounts,
  priceHistory,
  isOwner,
}: Props) {
  const t = useTranslations("ProductEditor");
  const tProducts = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountScope, setDiscountScope] = useState<"product" | "category" | "global">(
    "product"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const availableChildren = childCategories.filter((c) => c.parentId === categoryId);

  function run(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMsg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("genericError"));
      }
    });
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{product.productName}</h1>
          <p className="text-sm text-muted-foreground">{product.productId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <a href={`/api/products/${product.id}/datasheet?format=pptx`}>
              <Download className="h-4 w-4" /> PPTX
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <a href={`/api/products/${product.id}/datasheet?format=pdf`}>
              <Download className="h-4 w-4" /> PDF
            </a>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={isPending}
            onClick={() => run(() => duplicateProduct(product.id), t("toasts.duplicated"))}
          >
            {t("duplicate")}
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl"
            disabled={isPending}
            onClick={() => run(() => softDeleteProduct(product.id), t("toasts.deleted"))}
          >
            {tCommon("delete")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="translations">{t("tabs.translations")}</TabsTrigger>
          <TabsTrigger value="specifications">{t("tabs.specifications")}</TabsTrigger>
          <TabsTrigger value="images">
            {t("tabs.images", { count: product.images.length })}
          </TabsTrigger>
          <TabsTrigger value="variants">{t("tabs.variants")}</TabsTrigger>
          <TabsTrigger value="pricing">{t("tabs.pricing")}</TabsTrigger>
          <TabsTrigger value="discounts">{t("tabs.discounts")}</TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("general.title")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("general.productName")}</Label>
                <Input
                  className="rounded-xl"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("general.brand")}</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.category")}</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v);
                    const firstChild = childCategories.find((c) => c.parentId === v);
                    if (firstChild) setLightingtypeId(firstChild.id);
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {topCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.subcategory")}</Label>
                <Select value={lightingtypeId} onValueChange={setLightingtypeId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChildren.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.colorTemperature")}</Label>
                <Select value={productColor} onValueChange={setProductColor}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {tProducts(`colorTemp.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.baseIp")}</Label>
                <Select value={productIp} onValueChange={setProductIp}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_IPS.map((ip) => (
                      <SelectItem key={ip} value={ip}>
                        {ip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.maxIp")}</Label>
                <Input
                  className="rounded-xl"
                  type="number"
                  placeholder={t("general.maxIpPlaceholder")}
                  value={maxIP}
                  onChange={(e) => setMaxIP(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("general.chandLamp")}</Label>
                <Select value={productChandLamp} onValueChange={setProductChandLamp}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CHAND_LAMPS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {tProducts(`chandLamp.${l}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("general.chandLightingType")}</Label>
                <Input
                  className="rounded-xl"
                  placeholder={t("general.chandLightingTypePlaceholder")}
                  value={chandelierLightingType}
                  onChange={(e) => setChandelierLightingType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("general.heads")}</Label>
                <Input
                  className="rounded-xl"
                  type="number"
                  value={hNumber}
                  onChange={(e) => setHNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {t("general.datasheetUrl")}
                </Label>
                <Input
                  className="rounded-xl"
                  dir="ltr"
                  placeholder={t("general.datasheetUrlPlaceholder")}
                  value={specSheetUrl}
                  onChange={(e) => setSpecSheetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("general.datasheetUrlHint")}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <Button
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setIsActive((v) => !v)}
                >
                  {isActive ? tCommon("active") : tCommon("inactive")}
                </Button>
                <Button
                  type="button"
                  variant={featured ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setFeatured((v) => !v)}
                >
                  {featured ? t("general.featured") : t("general.notFeatured")}
                </Button>
              </div>

              <Button
                className="rounded-xl sm:col-span-2 sm:w-fit"
                disabled={isPending}
                onClick={() =>
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
                  )
                }
              >
                {t("general.saveChanges")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Translations ────────────────────────────────────── */}
        <TabsContent value="translations">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("translations.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("translations.description")}
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.value} value={l.value}>
                      {l.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.value} value={l.value}>
                    <TranslationForm
                      language={l.value}
                      productCuid={product.id}
                      productSku={product.productId}
                      initial={product.translations.find((t) => t.language === l.value)}
                      isPending={isPending}
                      run={run}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Specifications ──────────────────────────────────── */}
        <TabsContent value="specifications">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("specifications.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("specifications.description")}
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  {LANGUAGES.map((l) => (
                    <TabsTrigger key={l.value} value={l.value}>
                      {l.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANGUAGES.map((l) => (
                  <TabsContent key={l.value} value={l.value}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Images ──────────────────────────────────────────── */}
        <TabsContent value="images">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("images.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("images.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploadDropzone
                productId={product.id}
                productSku={product.productId}
                isPending={isPending}
                run={run}
              />

              <div className="flex max-w-xl gap-2">
                <Input
                  className="rounded-xl"
                  placeholder={t("images.urlPlaceholder")}
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <Button
                  className="rounded-xl"
                  variant="outline"
                  disabled={isPending || !newImageUrl}
                  onClick={() =>
                    run(async () => {
                      await addProductImage(product.id, newImageUrl, product.productName);
                      setNewImageUrl("");
                    }, t("images.added"))
                  }
                >
                  {t("images.addUrl")}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {product.images.map((img, index) => (
                  <div key={img.id} className="space-y-2 rounded-xl border border-border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.altText ?? ""}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <div className="flex items-center justify-between">
                      {img.isPrimary ? (
                        <Badge>{t("images.primary")}</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          disabled={isPending}
                          onClick={() =>
                            run(() => setPrimaryImage(img.id, product.id), t("images.primarySet"))
                          }
                        >
                          {t("images.setPrimary")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending}
                        onClick={() =>
                          run(() => removeProductImage(img.id, product.id), t("images.removed"))
                        }
                      >
                        {t("images.remove")}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending || index === 0}
                        onClick={() => {
                          const order = product.images.map((i) => i.id);
                          [order[index - 1], order[index]] = [order[index], order[index - 1]];
                          run(() => reorderProductImages(product.id, order), t("images.reordered"));
                        }}
                      >
                        {t("images.moveUp")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending || index === product.images.length - 1}
                        onClick={() => {
                          const order = product.images.map((i) => i.id);
                          [order[index + 1], order[index]] = [order[index], order[index + 1]];
                          run(() => reorderProductImages(product.id, order), t("images.reordered"));
                        }}
                      >
                        {t("images.moveDown")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Variants / stock ────────────────────────────────── */}
        <TabsContent value="variants">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("variants.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  variant={variant}
                  productId={product.id}
                  isPending={isPending}
                  run={run}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pricing ─────────────────────────────────────────── */}
        <TabsContent value="pricing">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("pricing.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="space-y-2">
                <Label>{t("pricing.price")}</Label>
                <div className="flex gap-2">
                  <Input
                    className="rounded-xl"
                    type="number"
                    value={priceInput}
                    disabled={!isOwner}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                  <Button
                    className="rounded-xl"
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
                  <p className="text-sm text-muted-foreground">
                    {t("pricing.ownerOnly")}
                  </p>
                )}
              </div>

              <div>
                <Label>{t("pricing.history")}</Label>
                {priceHistory.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">{t("pricing.noHistory")}</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {priceHistory.map((h) => (
                      <li key={h.id} className="flex justify-between border-b border-border py-1">
                        <span>
                          {format.number(h.oldPrice, { style: "currency", currency: "EGP" })}{" "}
                          <span className="inline-block rtl:rotate-180">→</span>{" "}
                          {format.number(h.newPrice, { style: "currency", currency: "EGP" })}
                        </span>
                        <span className="text-muted-foreground">
                          {format.dateTime(new Date(h.changedAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Discounts ───────────────────────────────────────── */}
        <TabsContent value="discounts">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>{t("discounts.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isOwner ? (
                <p className="text-sm text-muted-foreground">
                  {t("discounts.ownerOnly")}
                </p>
              ) : (
                <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-5 max-w-3xl">
                  <div className="space-y-1">
                    <Label>{t("discounts.type")}</Label>
                    <Select
                      value={discountType}
                      onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t("discounts.percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("discounts.fixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("discounts.scope")}</Label>
                    <Select
                      value={discountScope}
                      onValueChange={(v) =>
                        setDiscountScope(v as "product" | "category" | "global")
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">{t("discounts.scopeProduct")}</SelectItem>
                        <SelectItem value="category">{t("discounts.scopeCategory")}</SelectItem>
                        <SelectItem value="global">{t("discounts.scopeGlobal")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("discounts.value")}</Label>
                    <Input
                      className="rounded-xl"
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("discounts.code")}</Label>
                    <Input
                      className="rounded-xl"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                    />
                  </div>
                  <Button
                    className="rounded-xl"
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
                {discounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("discounts.none")}
                  </p>
                ) : (
                  discounts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-border p-2"
                    >
                      <span>
                        {d.type === "percentage"
                          ? t("discounts.percentOff", { value: d.value })
                          : t("discounts.amountOff", {
                              amount: format.number(d.value, { style: "currency", currency: "EGP" }),
                            })}
                        {d.code ? ` — ${t("discounts.withCode", { code: d.code })}` : ""}
                      </span>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg"
                          disabled={isPending}
                          onClick={() =>
                            run(() => deactivateDiscount(d.id), t("discounts.deactivated"))
                          }
                        >
                          {t("discounts.deactivate")}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
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
  run: (fn: () => Promise<unknown>, msg: string) => void;
}) {
  const t = useTranslations("ProductEditor.translations");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <div className="max-w-xl space-y-4 pt-4">
      <div className="space-y-2">
        <Label>{t("name", { language })}</Label>
        <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t("descriptionLabel", { language })}</Label>
        <Textarea
          className="rounded-xl"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button
        className="rounded-xl"
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
        {t("save", { language: language.toUpperCase() })}
      </Button>
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
  run: (fn: () => Promise<unknown>, msg: string) => void;
}) {
  const t = useTranslations("ProductEditor");
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
    <div className="space-y-4 pt-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPEC_FIELDS.map(({ key }) => (
          <div key={key} className="space-y-2">
            <Label>{t(`specFields.${key}`)}</Label>
            <Input
              className="rounded-xl"
              value={values[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <Button
        className="rounded-xl"
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
        {t("specifications.save", { language: language.toUpperCase() })}
      </Button>
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
  run: (fn: () => Promise<unknown>, msg: string) => void;
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
      for (const file of list) {
        const formData = new FormData();
        formData.set("file", file);
        await uploadProductImage(productId, productSku, formData);
      }
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
      onClick={() => !busy && inputRef.current?.click()}
      className={`flex max-w-xl cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      {busy ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <Upload className="h-6 w-6 text-muted-foreground" />
      )}
      <p className="text-sm font-medium">
        {busy ? t("uploading") : t("dropzone")}
      </p>
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
  run: (fn: () => Promise<unknown>, msg: string) => void;
}) {
  const t = useTranslations("ProductEditor.variants");
  const [wattage, setWattage] = useState(variant.wattage ?? "");
  const [finish, setFinish] = useState(variant.finish ?? "");
  const [size, setSize] = useState(variant.size ?? "");
  const [stock, setStock] = useState(String(variant.stock));

  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-xl border border-border p-3 md:grid-cols-5">
      <div className="space-y-1">
        <Label>{t("sku")}</Label>
        <Input className="rounded-xl" value={variant.sku} disabled />
      </div>
      <div className="space-y-1">
        <Label>{t("wattage")}</Label>
        <Input className="rounded-xl" value={wattage} onChange={(e) => setWattage(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{t("finish")}</Label>
        <Input className="rounded-xl" value={finish} onChange={(e) => setFinish(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{t("size")}</Label>
        <Input className="rounded-xl" value={size} onChange={(e) => setSize(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{t("stock")}</Label>
        <Input
          className="rounded-xl"
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </div>
      <Button
        className="col-span-2 rounded-xl md:col-span-5"
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
        {t("save")}
      </Button>
    </div>
  );
}
