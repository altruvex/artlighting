"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PageHeader, PageShell } from "@/components/page-header";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Card } from "@repo/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Loader2Icon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { createProduct } from "@/lib/actions/products";
import { familyFromSlug } from "@repo/catalog/families";
import Link from "next/link";

type Category = { id: string; name: string; slug: string; parentId: string | null };

type FieldName = "sku" | "name" | "price" | "stock" | "category" | "subcategory";
type Errors = Partial<Record<FieldName, string>>;

const BRANDS = [
  { value: "balcom", label: "Balcom" },
  { value: "mister-led", label: "Mister LED" },
];

/**
 * Creates the catalog record only: images, translations and specs are edited
 * on the product page afterwards, so this form stays short and validates
 * every field inline before the server action runs.
 */
export default function NewProductForm({
  topCategories,
  childCategories,
}: {
  topCategories: Category[];
  childCategories: Category[];
}) {
  const t = useTranslations("NewProduct");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fieldId = useId();

  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("balcom");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState(topCategories[0]?.id ?? "");
  const [lightingtypeId, setLightingtypeId] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const availableChildren = childCategories.filter((c) => c.parentId === categoryId);
  const selectedTop = topCategories.find((c) => c.id === categoryId);
  // The top category's slug is what names the family; the column is an enum,
  // so an unrecognised slug is caught here rather than at the server action.
  const family = selectedTop ? familyFromSlug(selectedTop.slug) : null;
  const selectedChild = childCategories.find((c) => c.id === lightingtypeId);

  function clearError(field: FieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!productId.trim()) next.sku = t("errors.skuRequired");
    if (!productName.trim()) next.name = t("errors.nameRequired");
    if (!price.trim()) next.price = t("errors.priceRequired");
    else if (!Number.isFinite(Number(price)) || Number(price) < 0)
      next.price = t("errors.priceInvalid");
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)
      next.stock = t("errors.stockInvalid");
    if (!categoryId || !selectedTop) next.category = t("errors.categoryRequired");
    else if (!family) next.category = t("errors.categoryNotAFamily");
    if (!lightingtypeId || !selectedChild) next.subcategory = t("errors.subcategoryRequired");
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const count = Object.values(found).filter(Boolean).length;
    if (count > 0) {
      toast.error(t("errors.summary", { count }));
      return;
    }
    if (!selectedTop || !selectedChild || !family) return;

    startTransition(async () => {
      try {
        const result = await createProduct({
          productId: productId.trim(),
          productName: productName.trim(),
          brand,
          sectionType: family,
          spotlightType: selectedChild.slug,
          categoryId,
          lightingtypeId,
          // Money stays a string all the way to the schema; see @repo/money.
          price,
          stock: Number(quantity),
        });
        // Failure comes back as a value: a thrown error would reach the
        // browser as an opaque digest in a production build.
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(t("created"));
        router.push(`/dashboard/products/${result.data.id}`);
      } catch (err) {
        // Only transport-level failures reach here now.
        console.error("createProduct failed", err);
        toast.error(t("errors.createFailed"));
      }
    });
  }

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Section
            title={t("sections.identity")}
            description={t("sections.identityDescription")}
          >
            <div className="space-y-4">
              <Field
                id={`${fieldId}-sku`}
                label={t("sku")}
                hint={t("skuHint")}
                error={errors.sku}
              >
                <Input
                  id={`${fieldId}-sku`}
                  dir="ltr"
                  className="font-mono text-xs"
                  placeholder={t("skuPlaceholder")}
                  value={productId}
                  aria-invalid={!!errors.sku}
                  aria-describedby={describedBy(`${fieldId}-sku`, !!errors.sku, true)}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    clearError("sku");
                  }}
                />
              </Field>

              <Field
                id={`${fieldId}-name`}
                label={t("productName")}
                hint={t("productNameHint")}
                error={errors.name}
              >
                <Input
                  id={`${fieldId}-name`}
                  value={productName}
                  aria-invalid={!!errors.name}
                  aria-describedby={describedBy(`${fieldId}-name`, !!errors.name, true)}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    clearError("name");
                  }}
                />
              </Field>

              <Field id={`${fieldId}-brand`} label={t("brand")}>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger id={`${fieldId}-brand`} className="w-full">
                    <SelectValue>{BRANDS.find((b) => b.value === brand)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="space-y-4">
            <Section
              title={t("sections.classification")}
              description={t("sections.classificationDescription")}
            >
              <div className="space-y-4">
                <Field
                  id={`${fieldId}-category`}
                  label={t("category")}
                  error={errors.category}
                >
                  <Select
                    value={categoryId}
                    onValueChange={(v) => {
                      setCategoryId(v);
                      setLightingtypeId("");
                      clearError("category");
                    }}
                  >
                    <SelectTrigger
                      id={`${fieldId}-category`}
                      className="w-full"
                      aria-invalid={!!errors.category}
                      aria-describedby={describedBy(`${fieldId}-category`, !!errors.category)}
                    >
                      <SelectValue>{topCategories.find((c) => c.id === categoryId)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {topCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  id={`${fieldId}-subcategory`}
                  label={t("subcategory")}
                  error={errors.subcategory}
                >
                  <Select
                    value={lightingtypeId}
                    onValueChange={(v) => {
                      setLightingtypeId(v);
                      clearError("subcategory");
                    }}
                  >
                    <SelectTrigger
                      id={`${fieldId}-subcategory`}
                      className="w-full"
                      aria-invalid={!!errors.subcategory}
                      aria-describedby={describedBy(
                        `${fieldId}-subcategory`,
                        !!errors.subcategory
                      )}
                    >
                      <SelectValue placeholder={t("subcategoryPlaceholder")}>
                        {availableChildren.find((c) => c.id === lightingtypeId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableChildren.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section
              title={t("sections.pricing")}
              description={t("sections.pricingDescription")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${fieldId}-price`} label={t("price")} error={errors.price}>
                  <Input
                    id={`${fieldId}-price`}
                    type="number"
                    dir="ltr"
                    inputMode="decimal"
                    min={0}
                    className="tabular-nums"
                    value={price}
                    aria-invalid={!!errors.price}
                    aria-describedby={describedBy(`${fieldId}-price`, !!errors.price)}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      clearError("price");
                    }}
                  />
                </Field>

                <Field
                  id={`${fieldId}-stock`}
                  label={t("initialStock")}
                  hint={t("initialStockHint")}
                  error={errors.stock}
                >
                  <Input
                    id={`${fieldId}-stock`}
                    type="number"
                    dir="ltr"
                    inputMode="numeric"
                    min={0}
                    className="tabular-nums"
                    value={quantity}
                    aria-invalid={!!errors.stock}
                    aria-describedby={describedBy(`${fieldId}-stock`, !!errors.stock, true)}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      clearError("stock");
                    }}
                  />
                </Field>
              </div>
            </Section>
          </div>
        </div>

        {/* Undoes PageShell's padding at every breakpoint, lg included. */}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-4 py-3 md:-mx-6 md:-mb-6 md:px-6 lg:-mx-8 lg:-mb-7 lg:px-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/products">{tCommon("cancel")}</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
            {isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

/** Builds the aria-describedby list for a field's hint and error nodes. */
function describedBy(id: string, hasError: boolean, hasHint = false) {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="border-b bg-muted/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground text-pretty">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
