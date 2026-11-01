"use client";

import { createDiscount, previewCart, setDiscountActive, updateDiscount } from "@/lib/actions/discounts";
import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { DateTimePicker } from "@repo/ui/components/date-time-picker";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { formatMoney, formatRateAsPercent } from "@/lib/money";
import { cn } from "@repo/ui/lib/utils";
import type { DiscountInput } from "@repo/catalog";
import type { AppliedDiscount, PricingResult, RejectedDiscount } from "@repo/pricing";
import { PlusIcon, TicketPercentIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

export type DiscountType = "PERCENTAGE" | "FIXED";
export type DiscountMode = "AUTOMATIC" | "COUPON";
export type DiscountScope = "PRODUCTS" | "CATEGORIES" | "FAMILIES" | "CART";
export type ProductFamily = "INDOOR" | "OUTDOOR" | "CHANDELIER";

const FAMILIES: ProductFamily[] = ["INDOOR", "OUTDOOR", "CHANDELIER"];

export interface DiscountRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: DiscountType;
  mode: DiscountMode;
  scope: DiscountScope;
  /** A rate: "0.1300" is 13%. Null unless the type is PERCENTAGE. */
  rate: string | null;
  /** Serialized money. Null unless the type is FIXED. */
  amount: string | null;
  code: string | null;
  minOrderValue: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usageCount: number;
  redemptionCount: number;
  stackable: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  productIds: string[];
  categoryIds: string[];
  families: ProductFamily[];
  targetNames: string[];
}

type Option = { id: string; label: string; sku?: string; isChild?: boolean };

/** Derived, not stored: a stopped discount is not the same as an expired one. */
function stateOf(row: DiscountRow, now: Date): { key: "active" | "scheduled" | "expired" | "stopped" | "usedUp"; tone: StatusTone } {
  if (!row.isActive) return { key: "stopped", tone: "neutral" };
  if (row.usageLimit != null && row.usageCount >= row.usageLimit) return { key: "usedUp", tone: "warning" };
  if (row.startsAt && now < row.startsAt) return { key: "scheduled", tone: "info" };
  if (row.endsAt && now >= row.endsAt) return { key: "expired", tone: "neutral" };
  return { key: "active", tone: "success" };
}

const BLANK: DiscountInput = {
  name: "",
  type: "PERCENTAGE",
  mode: "AUTOMATIC",
  scope: "CART",
  stackable: false,
  priority: 0,
  isActive: true,
  productIds: [],
  categoryIds: [],
  families: [],
};

export function DiscountsManager({
  discounts,
  products,
  categories,
  canWrite,
}: {
  discounts: DiscountRow[];
  products: Option[];
  categories: Option[];
  canWrite: boolean;
}) {
  const t = useTranslations("Discounts");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const fieldId = useId();
  const now = useMemo(() => new Date(), []);

  const [editing, setEditing] = useState<DiscountRow | "new" | null>(null);
  const [form, setForm] = useState<DiscountInput>(BLANK);
  const [percentInput, setPercentInput] = useState("");
  const [preview, setPreview] = useState<{ productName: string; quantity: number; result: PricingResult } | null>(null);
  const [previewProduct, setPreviewProduct] = useState("");
  const [previewCoupon, setPreviewCoupon] = useState("");
  const [isPending, startTransition] = useTransition();

  function open(row: DiscountRow | "new") {
    setEditing(row);
    if (row === "new") {
      setForm(BLANK);
      setPercentInput("");
      return;
    }
    setForm({
      name: row.name,
      type: row.type,
      mode: row.mode,
      scope: row.scope,
      rate: row.rate ?? undefined,
      amount: row.amount ?? undefined,
      code: row.code,
      minOrderValue: row.minOrderValue,
      usageLimit: row.usageLimit,
      perCustomerLimit: row.perCustomerLimit,
      stackable: row.stackable,
      priority: row.priority,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: row.isActive,
      productIds: row.productIds,
      categoryIds: row.categoryIds,
      families: row.families,
    });
    // The admin thinks in percent; the engine takes a rate.
    setPercentInput(row.rate ? String(Number(row.rate) * 100) : "");
  }

  function save() {
    const payload: DiscountInput = {
      ...form,
      // Converted at this one boundary, so the 0.13-versus-13 confusion has
      // exactly one place it could live.
      rate: form.type === "PERCENTAGE" && percentInput.trim() !== ""
        ? (Number(percentInput) / 100).toFixed(4)
        : undefined,
      amount: form.type === "FIXED" ? form.amount : undefined,
      code: form.mode === "COUPON" ? form.code : null,
    };

    startTransition(async () => {
      const result = editing === "new"
        ? await createDiscount(payload)
        : await updateDiscount((editing as DiscountRow).id, payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing === "new" ? t("created") : t("updated"));
      setEditing(null);
      router.refresh();
    });
  }

  function toggle(row: DiscountRow) {
    startTransition(async () => {
      const result = await setDiscountActive(row.id, !row.isActive);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(row.isActive ? t("stopped") : t("resumed"));
      router.refresh();
    });
  }

  function runPreview() {
    if (!previewProduct) return;
    startTransition(async () => {
      const result = await previewCart({
        productId: previewProduct,
        quantity: 1,
        coupon: previewCoupon.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPreview(result.data);
    });
  }

  const columns = useMemo<AdminColumn<DiscountRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => `${row.name} ${row.code ?? ""}`,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.name")} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate font-medium">{row.original.name}</span>
            {row.original.code && (
              <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
                {row.original.code}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "value",
        meta: { align: "end" },
        accessorFn: (row) => Number(row.rate ?? row.amount ?? 0),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.value")} />,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {row.original.type === "PERCENTAGE"
              ? formatRateAsPercent(row.original.rate ?? 0, { locale })
              : formatMoney(row.original.amount ?? 0, { locale })}
          </span>
        ),
      },
      {
        id: "applies",
        accessorFn: (row) => row.scope,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.applies")} />,
        filterFn: "arrIncludesSome",
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block text-sm">{t(`scope.${row.original.scope}` as const)}</span>
            {row.original.targetNames.length > 0 && (
              <span className="block truncate text-xs text-muted-foreground">
                {row.original.targetNames.length <= 2
                  ? row.original.targetNames.join(", ")
                  : t("targetsCount", { count: row.original.targetNames.length })}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "usage",
        meta: { align: "end" },
        accessorFn: (row) => row.usageCount,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.usage")} />,
        cell: ({ row }) => (
          <span className="tabular-nums text-sm" dir="ltr">
            {format.number(row.original.usageCount)}
            {row.original.usageLimit != null && ` / ${format.number(row.original.usageLimit)}`}
          </span>
        ),
      },
      {
        id: "state",
        accessorFn: (row) => stateOf(row, now).key,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.state")} />,
        filterFn: "arrIncludesSome",
        cell: ({ row }) => {
          const state = stateOf(row.original, now);
          return <StatusBadge tone={state.tone}>{t(`state.${state.key}` as const)}</StatusBadge>;
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        cell: ({ row }) =>
          canWrite && (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => open(row.original)}>
                {t("edit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggle(row.original)} disabled={isPending}>
                {row.original.isActive ? t("stop") : t("resume")}
              </Button>
            </div>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, format, locale, now, canWrite, isPending],
  );

  const targetOptions: Option[] =
    form.scope === "PRODUCTS"
      ? products
      : form.scope === "CATEGORIES"
        ? categories
        : FAMILIES.map((family) => ({ id: family, label: t(`family.${family}` as const) }));
  const selectedTargets =
    form.scope === "PRODUCTS" ? form.productIds : form.scope === "CATEGORIES" ? form.categoryIds : form.families;

  return (
    <div className="space-y-4">
      {/* The page's primary action sits over the list it adds to, not under
          it where a long table pushed it out of sight. */}
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => open("new")}>
            <PlusIcon aria-hidden className="size-4" />
            {t("new")}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={discounts}
        searchColumnId="name"
        searchPlaceholder={t("searchPlaceholder")}
        columnLabels={{
          name: t("columns.name"),
          value: t("columns.value"),
          applies: t("columns.applies"),
          usage: t("columns.usage"),
          state: t("columns.state"),
        }}
        facets={[
          {
            columnId: "state",
            title: t("columns.state"),
            options: (["active", "scheduled", "expired", "usedUp", "stopped"] as const).map((key) => ({
              value: key,
              label: t(`state.${key}` as const),
            })),
          },
          {
            columnId: "applies",
            title: t("columns.applies"),
            options: (["PRODUCTS", "CATEGORIES", "CART"] as const).map((key) => ({
              value: key,
              label: t(`scope.${key}` as const),
            })),
          },
        ]}
        emptyState={
          <EmptyState
            icon={TicketPercentIcon}
            title={t("empty.title")}
            description={t("empty.description")}
            action={canWrite ? <Button size="sm" onClick={() => open("new")}>{t("new")}</Button> : undefined}
          />
        }
      />

      {/* The preview: the engine, over a cart the admin builds. */}
      <section aria-labelledby="discount-preview-heading" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="space-y-0.5">
          <h2 id="discount-preview-heading" className="text-sm font-semibold">
            {t("preview.title")}
          </h2>
          <p className="max-w-[65ch] text-xs text-muted-foreground text-pretty">{t("preview.description")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-xs">
            <Label htmlFor={`${fieldId}-preview-product`}>{t("preview.product")}</Label>
            <Select value={previewProduct} onValueChange={setPreviewProduct}>
              <SelectTrigger id={`${fieldId}-preview-product`} className="w-full">
                <SelectValue placeholder={t("preview.choose")}>
                  {products.find((p) => p.id === previewProduct)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.slice(0, 200).map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-preview-coupon`}>{t("preview.coupon")}</Label>
            <Input
              id={`${fieldId}-preview-coupon`}
              value={previewCoupon}
              onChange={(event) => setPreviewCoupon(event.target.value)}
              placeholder={t("preview.couponPlaceholder")}
              className="w-40 font-mono"
              dir="ltr"
            />
          </div>
          <Button variant="outline" onClick={runPreview} disabled={isPending || !previewProduct}>
            {t("preview.run")}
          </Button>
        </div>

        {preview && (
          <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
            <div className="flex justify-between tabular-nums">
              <span>{t("preview.subtotal")}</span>
              <span>{formatMoney(preview.result.subtotal, { locale })}</span>
            </div>
            {preview.result.applied.map((applied: AppliedDiscount) => (
              <div key={applied.discountId} className="flex justify-between tabular-nums text-success">
                <span className="truncate">{applied.name}</span>
                <span>−{formatMoney(applied.amount, { locale })}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold tabular-nums">
              <span>{t("preview.total")}</span>
              <span>{formatMoney(preview.result.grandTotal, { locale })}</span>
            </div>
            {preview.result.rejected.length > 0 && (
              <ul className="space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
                {/* The half that is hard to work out by reading the rules. */}
                {preview.result.rejected.map((rejected: RejectedDiscount, index: number) => (
                  <li key={`${rejected.discountId}-${index}`}>
                    {rejected.name} — {t(`rejection.${rejected.reason}` as const)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("newTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${fieldId}-name`}>{t("fields.name")} *</Label>
              <Input
                id={`${fieldId}-name`}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={t("fields.namePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-mode`}>{t("fields.mode")}</Label>
              <Select value={form.mode} onValueChange={(mode) => setForm({ ...form, mode: mode as DiscountMode })}>
                <SelectTrigger id={`${fieldId}-mode`}><SelectValue>{t(`mode.${form.mode}`)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTOMATIC">{t("mode.AUTOMATIC")}</SelectItem>
                  <SelectItem value="COUPON">{t("mode.COUPON")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only a coupon has a code — a disabled box invites the question. */}
            {form.mode === "COUPON" && (
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-code`}>{t("fields.code")} *</Label>
                <Input
                  id={`${fieldId}-code`}
                  value={form.code ?? ""}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                  placeholder="SUMMER10"
                  className="font-mono"
                  dir="ltr"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-type`}>{t("fields.type")}</Label>
              <Select value={form.type} onValueChange={(type) => setForm({ ...form, type: type as DiscountType })}>
                <SelectTrigger id={`${fieldId}-type`}><SelectValue>{t(`type.${form.type}`)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">{t("type.PERCENTAGE")}</SelectItem>
                  <SelectItem value="FIXED">{t("type.FIXED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "PERCENTAGE" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-percent`}>{t("fields.percent")} *</Label>
                <Input
                  id={`${fieldId}-percent`}
                  inputMode="decimal"
                  value={percentInput}
                  onChange={(event) => setPercentInput(event.target.value)}
                  placeholder="13"
                  className="tabular-nums"
                  dir="ltr"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-amount`}>{t("fields.amount")} *</Label>
                <Input
                  id={`${fieldId}-amount`}
                  inputMode="decimal"
                  value={form.amount ?? ""}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="50.00"
                  className="tabular-nums"
                  dir="ltr"
                />
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${fieldId}-scope`}>{t("fields.scope")}</Label>
              <Select value={form.scope} onValueChange={(scope) => setForm({ ...form, scope: scope as DiscountScope })}>
                <SelectTrigger id={`${fieldId}-scope`}><SelectValue>{t(`scope.${form.scope}`)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CART">{t("scope.CART")}</SelectItem>
                  <SelectItem value="PRODUCTS">{t("scope.PRODUCTS")}</SelectItem>
                  <SelectItem value="FAMILIES">{t("scope.FAMILIES")}</SelectItem>
                  <SelectItem value="CATEGORIES">{t("scope.CATEGORIES")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope !== "CART" && (
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">
                  {form.scope === "PRODUCTS"
                    ? t("fields.products")
                    : form.scope === "FAMILIES"
                      ? t("fields.families")
                      : t("fields.categories")}{" "}
                  *
                </legend>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {targetOptions.map((option) => {
                    const checked = selectedTargets.includes(option.id);
                    return (
                      <label key={option.id} className="flex items-center gap-2 rounded-sm px-1 py-0.5 text-sm hover:bg-muted/60">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const ids = next
                              ? [...selectedTargets, option.id]
                              : selectedTargets.filter((id) => id !== option.id);
                            setForm(
                              form.scope === "PRODUCTS"
                                ? { ...form, productIds: ids }
                                : form.scope === "CATEGORIES"
                                  ? { ...form, categoryIds: ids }
                                  : { ...form, families: ids as ProductFamily[] },
                            );
                          }}
                        />
                        <span className={cn("truncate", option.isChild && "ps-3 text-muted-foreground")}>
                          {option.label}
                        </span>
                        {option.sku && <span className="ms-auto font-mono text-xs text-muted-foreground" dir="ltr">{option.sku}</span>}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("selectedCount", { count: selectedTargets.length })}
                </p>
              </fieldset>
            )}

            {/*
              The window the engine already honours. It was in the schema
              and in computePricing from the start; leaving it out of the
              form meant a scheduled promotion could not actually be
              scheduled.
            */}
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-starts`}>{t("fields.startsAt")}</Label>
              <DateTimePicker
                id={`${fieldId}-starts`}
                locale={locale}
                value={form.startsAt}
                onChange={(startsAt) => setForm({ ...form, startsAt })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-ends`}>{t("fields.endsAt")}</Label>
              <DateTimePicker
                id={`${fieldId}-ends`}
                locale={locale}
                value={form.endsAt}
                onChange={(endsAt) => setForm({ ...form, endsAt })}
              />
              <p className="text-xs text-muted-foreground">{t("fields.endsAtHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-min`}>{t("fields.minOrder")}</Label>
              <Input
                id={`${fieldId}-min`}
                inputMode="decimal"
                value={form.minOrderValue ?? ""}
                onChange={(event) => setForm({ ...form, minOrderValue: event.target.value || null })}
                className="tabular-nums"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-priority`}>{t("fields.priority")}</Label>
              <Input
                id={`${fieldId}-priority`}
                inputMode="numeric"
                value={String(form.priority)}
                onChange={(event) => setForm({ ...form, priority: Number(event.target.value) || 0 })}
                className="tabular-nums"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-usage`}>{t("fields.usageLimit")}</Label>
              <Input
                id={`${fieldId}-usage`}
                inputMode="numeric"
                value={form.usageLimit == null ? "" : String(form.usageLimit)}
                onChange={(event) => setForm({ ...form, usageLimit: event.target.value ? Number(event.target.value) : null })}
                placeholder={t("fields.unlimited")}
                className="tabular-nums"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-per-customer`}>{t("fields.perCustomerLimit")}</Label>
              <Input
                id={`${fieldId}-per-customer`}
                inputMode="numeric"
                value={form.perCustomerLimit == null ? "" : String(form.perCustomerLimit)}
                onChange={(event) => setForm({ ...form, perCustomerLimit: event.target.value ? Number(event.target.value) : null })}
                placeholder={t("fields.unlimited")}
                className="tabular-nums"
                dir="ltr"
              />
            </div>

            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.stackable}
                onCheckedChange={(next) => setForm({ ...form, stackable: next === true })}
              />
              <span>
                {t("fields.stackable")}
                <span className="block text-xs text-muted-foreground">{t("fields.stackableHint")}</span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isPending}>{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={save} disabled={isPending || form.name.trim() === ""}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
