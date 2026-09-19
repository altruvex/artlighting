"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { formatPrice } from "@/lib/utils";
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

const SPEC_FIELDS: { key: keyof ProductSpecificationInput; label: string }[] = [
  { key: "input", label: "Input (AC voltage)" },
  { key: "maximumWattage", label: "Maximum wattage" },
  { key: "brandOfLed", label: "Brand of LED" },
  { key: "luminousFlux", label: "Luminous flux" },
  { key: "mainMaterial", label: "Main material" },
  { key: "cri", label: "CRI" },
  { key: "beamAngle", label: "Beam angle" },
  { key: "workingTemperature", label: "Working temperature" },
  { key: "fixtureDimmable", label: "Fixture dimmable" },
  { key: "electrical", label: "Electrical (driver)" },
  { key: "powerFactor", label: "Power factor" },
  { key: "colorTemperature", label: "Color temperature" },
  { key: "ip", label: "IP rating" },
  { key: "energySaving", label: "Energy saving" },
  { key: "lifeTime", label: "Life time" },
  { key: "finish", label: "Finish (chandeliers)" },
  { key: "lampBase", label: "Lamp base (chandeliers)" },
  { key: "bulb", label: "Bulb included (chandeliers)" },
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
        toast.error(err instanceof Error ? err.message : "Something went wrong");
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
            onClick={() => run(() => duplicateProduct(product.id), "Product duplicated")}
          >
            Duplicate
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl"
            disabled={isPending}
            onClick={() => run(() => softDeleteProduct(product.id), "Product deleted (soft)")}
          >
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="images">Images ({product.images.length})</TabsTrigger>
          <TabsTrigger value="variants">Stock & Variant</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Product name</Label>
                <Input
                  className="rounded-xl"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
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
                <Label>Category</Label>
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
                <Label>Subcategory (lighting type)</Label>
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
                <Label>Color temperature</Label>
                <Select value={productColor} onValueChange={setProductColor}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Base IP rating</Label>
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
                <Label>Max IP rating (integer)</Label>
                <Input
                  className="rounded-xl"
                  type="number"
                  placeholder="e.g. 65"
                  value={maxIP}
                  onChange={(e) => setMaxIP(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Chandelier lamp wattage</Label>
                <Select value={productChandLamp} onValueChange={setProductChandLamp}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CHAND_LAMPS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chandelier lighting type</Label>
                <Input
                  className="rounded-xl"
                  placeholder="LED or lamp"
                  value={chandelierLightingType}
                  onChange={(e) => setChandelierLightingType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of heads (chandeliers)</Label>
                <Input
                  className="rounded-xl"
                  type="number"
                  value={hNumber}
                  onChange={(e) => setHNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Datasheet PDF URL
                </Label>
                <Input
                  className="rounded-xl"
                  placeholder="https://... link to the spec sheet PDF"
                  value={specSheetUrl}
                  onChange={(e) => setSpecSheetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Same URL-based approach as images — paste a link once the PDF is hosted
                  somewhere. Wiring an actual upload flow is follow-up work once a storage
                  provider is chosen.
                </p>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <Button
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setIsActive((v) => !v)}
                >
                  {isActive ? "Active" : "Inactive"}
                </Button>
                <Button
                  type="button"
                  variant={featured ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setFeatured((v) => !v)}
                >
                  {featured ? "Featured" : "Not featured"}
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
                    "Saved"
                  )
                }
              >
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Translations ────────────────────────────────────── */}
        <TabsContent value="translations">
          <Card className="glass-surface rounded-2xl">
            <CardHeader>
              <CardTitle>Translations</CardTitle>
              <p className="text-sm text-muted-foreground">
                The localized name and description shown on the storefront per language.
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
              <CardTitle>Specifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                Technical spec sheet fields shown on the product page, per language.
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
              <CardTitle>Images</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload files directly, or paste a URL for an image already hosted elsewhere.
                JPEG/PNG/WEBP/AVIF, up to 8MB.
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
                  placeholder="or paste an existing image URL"
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
                    }, "Image added")
                  }
                >
                  Add URL
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
                        <Badge>Primary</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          disabled={isPending}
                          onClick={() =>
                            run(() => setPrimaryImage(img.id, product.id), "Primary image set")
                          }
                        >
                          Set primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending}
                        onClick={() =>
                          run(() => removeProductImage(img.id, product.id), "Image removed")
                        }
                      >
                        Remove
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
                          run(() => reorderProductImages(product.id, order), "Reordered");
                        }}
                      >
                        ← Move up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={isPending || index === product.images.length - 1}
                        onClick={() => {
                          const order = product.images.map((i) => i.id);
                          [order[index + 1], order[index]] = [order[index], order[index + 1]];
                          run(() => reorderProductImages(product.id, order), "Reordered");
                        }}
                      >
                        Move down →
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
              <CardTitle>Stock & variant</CardTitle>
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
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="space-y-2">
                <Label>Price (EGP)</Label>
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
                        "Price updated"
                      )
                    }
                  >
                    Update price
                  </Button>
                </div>
                {!isOwner && (
                  <p className="text-sm text-muted-foreground">
                    Only owners can change price.
                  </p>
                )}
              </div>

              <div>
                <Label>Price history</Label>
                {priceHistory.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No changes recorded yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {priceHistory.map((h) => (
                      <li key={h.id} className="flex justify-between border-b border-border py-1">
                        <span>
                          {formatPrice(h.oldPrice)} → {formatPrice(h.newPrice)}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(h.changedAt).toLocaleString()}
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
              <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isOwner ? (
                <p className="text-sm text-muted-foreground">
                  Only owners can create or change discounts.
                </p>
              ) : (
                <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-5 max-w-3xl">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={discountType}
                      onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Scope</Label>
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
                        <SelectItem value="product">This product</SelectItem>
                        <SelectItem value="category">This category</SelectItem>
                        <SelectItem value="global">Store-wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Value</Label>
                    <Input
                      className="rounded-xl"
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Coupon code (optional)</Label>
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
                        "Discount created"
                      )
                    }
                  >
                    Create discount
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {discounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active discounts on this product.
                  </p>
                ) : (
                  discounts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-border p-2"
                    >
                      <span>
                        {d.type === "percentage" ? `${d.value}%` : formatPrice(d.value)} off
                        {d.code ? ` — code ${d.code}` : ""}
                      </span>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg"
                          disabled={isPending}
                          onClick={() =>
                            run(() => deactivateDiscount(d.id), "Discount deactivated")
                          }
                        >
                          Deactivate
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
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <div className="max-w-xl space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Name ({language})</Label>
        <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description ({language})</Label>
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
            `${language.toUpperCase()} translation saved`
          )
        }
      >
        Save {language.toUpperCase()} translation
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
        {SPEC_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
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
            `${language.toUpperCase()} specifications saved`
          )
        }
      >
        Save {language.toUpperCase()} specifications
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
    }, list.length > 1 ? `${list.length} images uploaded` : "Image uploaded");
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
        {busy ? "Uploading..." : "Drag images here, or click to browse"}
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
  const [wattage, setWattage] = useState(variant.wattage ?? "");
  const [finish, setFinish] = useState(variant.finish ?? "");
  const [size, setSize] = useState(variant.size ?? "");
  const [stock, setStock] = useState(String(variant.stock));

  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-xl border border-border p-3 md:grid-cols-5">
      <div className="space-y-1">
        <Label>SKU</Label>
        <Input className="rounded-xl" value={variant.sku} disabled />
      </div>
      <div className="space-y-1">
        <Label>Wattage</Label>
        <Input className="rounded-xl" value={wattage} onChange={(e) => setWattage(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Finish</Label>
        <Input className="rounded-xl" value={finish} onChange={(e) => setFinish(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Size</Label>
        <Input className="rounded-xl" value={size} onChange={(e) => setSize(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Stock</Label>
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
            "Variant updated"
          )
        }
      >
        Save variant
      </Button>
    </div>
  );
}
