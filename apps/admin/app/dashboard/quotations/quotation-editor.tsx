"use client";

import {
  assignQuotation,
  createCustomer,
  createQuotation,
  deleteQuotation,
  reviseQuotation,
  setQuotationStatus,
  updateQuotation,
} from "@/lib/actions/quotations";
import type { ActionResult } from "@/lib/actions/result";
import { PageHeader, PageShell } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { formatMoney } from "@/lib/money";
import { QUOTATION_CURRENCIES, type QuotationInput, type QuotationStatus } from "@/lib/quotations/schema";
import {
  quotationStatusTone,
  type CustomerOption,
  type ProductOption,
  type QuotationActivityView,
  type QuotationLineView,
  type QuotationView,
} from "@/lib/quotations/view";
import { cn } from "@repo/ui/lib/utils";
import { isValidMoney, money } from "@repo/money";
import { computeQuotationTotals, type QuotationDiscountInput } from "@repo/pricing";
import {
  ArrowLeftIcon, CheckIcon, ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon, CopyIcon, DownloadIcon,
  FilePlus2Icon, PackagePlusIcon, SendIcon, Trash2Icon, UserPlusIcon, XIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

// ---- Editor state ----------------------------------------------------------
// Percentages are typed as percents ("14") and become fractions ("0.14") only
// on the way to the server and into the totals engine.

interface LineState {
  key: string;
  productId: string | null;
  variantId: string | null;
  sku: string;
  name: string;
  description: string;
  imageUrl: string | null;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

let keySeed = 0;
const nextKey = () => `l${++keySeed}`;

const rateToPercent = (rate: string | null | undefined) =>
  rate && isValidMoney(rate) ? money(rate).times(100).toDecimalPlaces(2).toString() : "0";
const percentToRate = (percent: string) =>
  isValidMoney(percent) ? money(percent).dividedBy(100).toDecimalPlaces(4).toString() : "0";
const safeMoney = (value: string) => (isValidMoney(value) && !money(value).isNegative() ? value : "0");
const safeQty = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

function lineFromView(line: QuotationLineView): LineState {
  return {
    key: nextKey(),
    productId: line.productId,
    variantId: line.variantId,
    sku: line.sku,
    name: line.name,
    description: line.description ?? "",
    imageUrl: line.imageUrl,
    quantity: String(line.quantity),
    unitPrice: line.unitPrice,
    discountPercent: rateToPercent(line.discountRate),
  };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface QuotationEditorProps {
  quotation: QuotationView | null;
  customers: CustomerOption[];
  products: ProductOption[];
  canWrite: boolean;
  /** People a manager can hand this quotation to; empty for anyone who cannot reassign. */
  assignees?: { id: string; name: string }[];
  defaults: { taxRate: string; validityDays: number; terms: string; today: string };
}

export function QuotationEditor({ quotation, customers: initialCustomers, products, canWrite, assignees = [], defaults }: QuotationEditorProps) {
  const t = useTranslations("QuotationEditor");
  const tStatus = useTranslations("QuotationStatus");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const fieldId = useId();
  const [isPending, startTransition] = useTransition();

  const status: QuotationStatus = quotation?.status ?? "DRAFT";
  const editable = canWrite && status === "DRAFT";

  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(quotation?.customerId ?? "");
  const [currency, setCurrency] = useState(quotation?.currency ?? "EGP");
  const [issueDate, setIssueDate] = useState(quotation?.issueDate ?? defaults.today);
  const [validUntil, setValidUntil] = useState(quotation?.validUntil ?? addDays(defaults.today, defaults.validityDays));
  const [subject, setSubject] = useState(quotation?.subject ?? "");
  const [discountType, setDiscountType] = useState<"NONE" | "PERCENTAGE" | "FIXED">(quotation?.discountType ?? "NONE");
  const [discountValue, setDiscountValue] = useState(
    quotation?.discountType === "PERCENTAGE" ? rateToPercent(quotation.discountValue) : (quotation?.discountValue ?? ""),
  );
  const [taxPercent, setTaxPercent] = useState(rateToPercent(quotation?.taxRate ?? defaults.taxRate));
  const [terms, setTerms] = useState(quotation?.terms ?? (quotation ? "" : defaults.terms));
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [lines, setLines] = useState<LineState[]>(() => (quotation?.lines ?? []).map(lineFromView));

  // Unsaved-change guard: compare against what was loaded.
  const snapshot = JSON.stringify({ customerId, currency, issueDate, validUntil, subject, discountType, discountValue, taxPercent, terms, notes, lines: lines.map(({ key: _k, ...l }) => l) });
  const [saved, setSaved] = useState(snapshot);
  const dirty = editable && snapshot !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const customer = customers.find((c) => c.id === customerId) ?? null;

  const discount: QuotationDiscountInput =
    discountType === "PERCENTAGE"
      ? { type: "PERCENTAGE", rate: percentToRate(discountValue) }
      : discountType === "FIXED"
        ? { type: "FIXED", amount: safeMoney(discountValue) }
        : null;
  const totals = useMemo(
    () =>
      computeQuotationTotals({
        lines: lines.map((l) => ({ quantity: safeQty(l.quantity), unitPrice: safeMoney(l.unitPrice), discountRate: percentToRate(l.discountPercent) })),
        discount,
        taxRate: percentToRate(taxPercent),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, discountType, discountValue, taxPercent],
  );
  const fmt = (value: string) => formatMoney(value, { locale, currency });

  const updateLine = (key: string, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const moveLine = (index: number, delta: -1 | 1) =>
    setLines((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  function addProduct(product: ProductOption, variant: ProductOption["variants"][number] | null) {
    setLines((prev) => {
      // Adding the same item again raises its quantity instead of a duplicate row.
      const existing = prev.find((l) => l.productId === product.id && l.variantId === (variant?.id ?? null));
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: String(safeQty(l.quantity) + 1) } : l));
      }
      return [
        ...prev,
        {
          key: nextKey(),
          productId: product.id,
          variantId: variant?.id ?? null,
          sku: variant?.sku ?? product.sku,
          name: variant && product.variants.length > 1 ? `${product.name} — ${variant.label}` : product.name,
          description: product.description ?? "",
          imageUrl: product.imageUrl,
          quantity: "1",
          unitPrice: variant?.price ?? product.price,
          discountPercent: "0",
        },
      ];
    });
  }

  function addCustomLine() {
    setLines((prev) => [
      ...prev,
      { key: nextKey(), productId: null, variantId: null, sku: "", name: "", description: "", imageUrl: null, quantity: "1", unitPrice: "0", discountPercent: "0" },
    ]);
  }

  function payload(): QuotationInput {
    return {
      customerId,
      currency: currency as QuotationInput["currency"],
      issueDate,
      validUntil,
      subject,
      discountType: discountType === "NONE" ? null : discountType,
      discountValue: discountType === "PERCENTAGE" ? percentToRate(discountValue) : discountType === "FIXED" ? discountValue : null,
      taxRate: percentToRate(taxPercent),
      terms,
      notes,
      lines: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        sku: l.sku,
        name: l.name,
        description: l.description,
        imageUrl: l.imageUrl,
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice,
        discountRate: percentToRate(l.discountPercent),
      })),
    };
  }

  function act<T>(fn: () => Promise<ActionResult<T>>, success: string, then?: (data: T) => void) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      then?.(result.data);
    });
  }

  function save() {
    if (!quotation) {
      act(() => createQuotation(payload()), t("created"), ({ id }) => {
        setSaved(snapshot);
        router.push(`/dashboard/quotations/${id}`);
      });
    } else {
      act(() => updateQuotation(quotation.id, payload()), t("saved"), () => {
        setSaved(snapshot);
        router.refresh();
      });
    }
  }

  const title = quotation ? (
    <span className="flex flex-wrap items-center gap-2">
      <span dir="ltr" className="font-mono">{quotation.number}</span>
      <StatusBadge tone={quotationStatusTone(status)}>{tStatus(status)}</StatusBadge>
    </span>
  ) : (
    t("newTitle")
  );

  const description = quotation
    ? t("meta", {
        by: quotation.createdBy || "—",
        created: format.dateTime(new Date(quotation.createdAt), { dateStyle: "medium" }),
      })
    : t("newSubtitle");

  return (
    <PageShell className="max-w-[1400px]">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/dashboard/quotations">
                <ArrowLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
                {t("back")}
              </Link>
            </Button>

            {quotation && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={dirty} title={dirty ? t("saveFirst") : undefined}>
                    <DownloadIcon aria-hidden className="size-4" />
                    {t("download")}
                    <ChevronDownIcon aria-hidden className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["pdf", "pptx", "xlsx"] as const).map((fmtKey) => (
                    <DropdownMenuItem key={fmtKey} asChild>
                      <a href={`/api/quotations/${quotation.id}/document?format=${fmtKey}`}>{t(`formats.${fmtKey}`)}</a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {quotation && canWrite && status !== "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => act(() => reviseQuotation(quotation.id), t("revised"), ({ id }) => router.push(`/dashboard/quotations/${id}`))}
              >
                <CopyIcon aria-hidden className="size-4" />
                {t("revise")}
              </Button>
            )}

            {quotation && canWrite && status === "SENT" && (
              <>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => act(() => setQuotationStatus(quotation.id, "REJECTED"), t("statusChanged"), () => router.refresh())}>
                  <XIcon aria-hidden className="size-4" />
                  {t("markRejected")}
                </Button>
                <Button size="sm" disabled={isPending} onClick={() => act(() => setQuotationStatus(quotation.id, "ACCEPTED"), t("statusChanged"), () => router.refresh())}>
                  <CheckIcon aria-hidden className="size-4" />
                  {t("markAccepted")}
                </Button>
              </>
            )}

            {quotation && editable && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending || dirty || lines.length === 0} title={dirty ? t("saveFirst") : undefined}>
                    <SendIcon aria-hidden className="size-4" />
                    {t("markSent")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("markSentTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("markSentDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act(() => setQuotationStatus(quotation.id, "SENT"), t("statusChanged"), () => router.refresh())}>
                      {t("markSent")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {editable && (
              <Button size="sm" disabled={isPending || (!!quotation && !dirty)} onClick={save}>
                {isPending ? tCommon("saving") : quotation ? tCommon("save") : t("createDraft")}
              </Button>
            )}
          </>
        }
      />

      {quotation?.revisionOf && (
        <p className="text-sm text-muted-foreground">
          {t.rich("revisionOf", {
            link: (chunks) => (
              <Link className="font-mono underline underline-offset-4" dir="ltr" href={`/dashboard/quotations/${quotation.revisionOf!.id}`}>
                {chunks}
              </Link>
            ),
            number: quotation.revisionOf.number,
          })}
        </p>
      )}
      {quotation && quotation.revisions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("revisedBy")}{" "}
          {quotation.revisions.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ", "}
              <Link className="font-mono underline underline-offset-4" dir="ltr" href={`/dashboard/quotations/${r.id}`}>{r.number}</Link>
            </span>
          ))}
        </p>
      )}
      {!editable && quotation && canWrite && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">{t("readOnlyHint")}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Section title={t("sections.customer")} description={t("sections.customerDescription")}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("fields.customer")}</Label>
                <div className="flex gap-2">
                  <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} disabled={!editable} />
                  {editable && (
                    <NewCustomerDialog
                      onCreated={(c) => {
                        setCustomers((prev) => [...prev, c].sort((a, b) => a.label.localeCompare(b.label)));
                        setCustomerId(c.id);
                      }}
                    />
                  )}
                </div>
                {customer && (
                  <p className="text-xs text-muted-foreground" dir="auto">
                    {[customer.phone, customer.email, customer.address?.replace(/\r?\n/g, ", "), customer.taxId && t("taxIdShort", { id: customer.taxId })]
                      .filter(Boolean)
                      .join("  ·  ") || t("noContactDetails")}
                  </p>
                )}
              </div>
              <Field id={`${fieldId}-subject`} label={t("fields.subject")} hint={t("fields.subjectHint")} className="md:col-span-2">
                <Input id={`${fieldId}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editable} maxLength={200} dir="auto" />
              </Field>
              <Field id={`${fieldId}-issue`} label={t("fields.issueDate")}>
                <Input id={`${fieldId}-issue`} type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={!editable} />
              </Field>
              <Field id={`${fieldId}-valid`} label={t("fields.validUntil")}>
                <div className="flex gap-2">
                  <Input id={`${fieldId}-valid`} type="date" value={validUntil} min={issueDate} onChange={(e) => setValidUntil(e.target.value)} disabled={!editable} />
                  {editable && (
                    <Select onValueChange={(days) => setValidUntil(addDays(issueDate, Number(days)))}>
                      <SelectTrigger className="w-28 shrink-0" aria-label={t("fields.validityPreset")}>
                        <SelectValue placeholder={t("fields.validityPreset")} />
                      </SelectTrigger>
                      <SelectContent>
                        {[7, 15, 30, 60, 90].map((d) => (
                          <SelectItem key={d} value={String(d)}>{t("days", { count: d })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Field>
            </div>
          </Section>

          <Section
            title={t("sections.items")}
            description={t("sections.itemsDescription")}
            action={<span className="text-xs text-muted-foreground tabular-nums">{t("lineCount", { count: lines.length })}</span>}
            flush
          >
            {lines.length === 0 ? (
              <EmptyState icon={PackagePlusIcon} title={t("noLines")} className="py-10" />
            ) : (
              <ol className="@container divide-y">
                {lines.map((line, index) => (
                  <LineRow
                    key={line.key}
                    line={line}
                    index={index}
                    count={lines.length}
                    editable={editable}
                    lineTotal={totals.lines[index]?.lineTotal ?? "0"}
                    fmt={fmt}
                    onChange={(patch) => updateLine(line.key, patch)}
                    onMove={(delta) => moveLine(index, delta)}
                    onRemove={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  />
                ))}
              </ol>
            )}
            {editable && (
              <div className="flex flex-wrap gap-2 border-t bg-muted/30 px-4 py-3">
                <ProductPicker products={products} onPick={addProduct} />
                <Button variant="ghost" size="sm" onClick={addCustomLine}>
                  <FilePlus2Icon aria-hidden className="size-4" />
                  {t("addCustomLine")}
                </Button>
              </div>
            )}
          </Section>

          <Section title={t("sections.terms")} description={t("sections.termsDescription")}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id={`${fieldId}-terms`} label={t("fields.terms")} hint={t("fields.termsHint")}>
                <Textarea id={`${fieldId}-terms`} rows={7} value={terms} onChange={(e) => setTerms(e.target.value)} disabled={!editable} dir="ltr" />
              </Field>
              <Field id={`${fieldId}-notes`} label={t("fields.notes")} hint={t("fields.notesHint")}>
                <Textarea id={`${fieldId}-notes`} rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} dir="auto" />
              </Field>
            </div>
          </Section>
          {quotation && <ActivityLog items={quotation.activity} currency={quotation.currency} />}
        </div>

        {/* top-20 clears the sticky top bar, which covered the panel's head. */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {quotation && (
            <Section title={t("sections.owner")} description={t("sections.ownerDescription")}>
              {assignees.length > 0 ? (
                <Select
                  value={quotation.owner.id}
                  disabled={isPending}
                  onValueChange={(ownerId) =>
                    act(() => assignQuotation(quotation.id, ownerId), t("assigned"), () => router.refresh())
                  }
                >
                  <SelectTrigger className="w-full" aria-label={t("sections.owner")}>
                    <SelectValue>{quotation.owner.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* The current owner stays listed even if they could not be chosen now. */}
                    {[...assignees, ...(assignees.some((a) => a.id === quotation.owner.id) ? [] : [quotation.owner])].map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{quotation.owner.name}</p>
              )}
            </Section>
          )}
          <Section title={t("sections.summary")}>
            <div className="space-y-4">
              <Field id={`${fieldId}-currency`} label={t("fields.currency")}>
                <Select value={currency} onValueChange={setCurrency} disabled={!editable}>
                  <SelectTrigger id={`${fieldId}-currency`} className="w-full">
                    <SelectValue>{currency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTATION_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <dl className="space-y-2 text-sm">
                <SummaryRow label={t("totals.subtotal")} value={fmt(totals.subtotal)} />

                {/* A row like VAT beneath it, not a box inside the totals card. */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">{t("totals.discount")}</dt>
                    <dd className="tabular-nums">{Number(totals.discountTotal) > 0 ? `− ${fmt(totals.discountTotal)}` : "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)} disabled={!editable}>
                      <SelectTrigger size="sm" className="w-32 shrink-0" aria-label={t("totals.discountType")}>
                        <SelectValue>
                          {discountType === "NONE" ? t("totals.none") : discountType === "PERCENTAGE" ? t("totals.percent") : t("totals.amount")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{t("totals.none")}</SelectItem>
                        <SelectItem value="PERCENTAGE">{t("totals.percent")}</SelectItem>
                        <SelectItem value="FIXED">{t("totals.amount")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountType !== "NONE" && (
                      <NumberInput
                        value={discountValue}
                        onChange={setDiscountValue}
                        disabled={!editable}
                        suffix={discountType === "PERCENTAGE" ? "%" : currency}
                        label={t("totals.discountValue")}
                        max={discountType === "PERCENTAGE" ? 100 : undefined}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    {t("totals.vat")}
                    <NumberInput value={taxPercent} onChange={setTaxPercent} disabled={!editable} suffix="%" label={t("totals.vatRate")} max={100} className="w-24" />
                  </dt>
                  <dd className="tabular-nums">{fmt(totals.taxTotal)}</dd>
                </div>

                <div className="flex items-baseline justify-between gap-2 border-t pt-3">
                  <dt className="font-semibold">{t("totals.total")}</dt>
                  <dd className="font-display text-[length:var(--text-xl)] font-medium tabular-nums">{fmt(totals.grandTotal)}</dd>
                </div>
              </dl>

              {quotation?.sentAt && (
                <p className="text-xs text-muted-foreground">
                  {t("sentOn", { date: format.dateTime(new Date(quotation.sentAt), { dateStyle: "medium" }) })}
                  {quotation.respondedAt &&
                    ` · ${t("respondedOn", { date: format.dateTime(new Date(quotation.respondedAt), { dateStyle: "medium" }) })}`}
                </p>
              )}
              {dirty && <p className="text-xs text-warning">{t("unsaved")}</p>}

              {editable && (
                <Button className="w-full" disabled={isPending || (!!quotation && !dirty)} onClick={save}>
                  {isPending ? tCommon("saving") : quotation ? tCommon("save") : t("createDraft")}
                </Button>
              )}
              {quotation && editable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive" disabled={isPending}>
                      <Trash2Icon aria-hidden className="size-4" />
                      {t("deleteDraft")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteTitle", { number: quotation.number })}</AlertDialogTitle>
                      <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => act(() => deleteQuotation(quotation.id), t("deleted"), () => {
                          setSaved(snapshot);
                          router.push("/dashboard/quotations");
                        })}
                      >
                        {tCommon("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Section>
        </aside>
      </div>
    </PageShell>
  );
}

// ---- Pieces -------------------------------------------------------------------

/** Who did what to this quotation, newest first. */
function ActivityLog({ items, currency }: { items: QuotationActivityView[]; currency: string }) {
  const t = useTranslations("QuotationEditor.activity");
  const tStatus = useTranslations("QuotationStatus");
  const tSections = useTranslations("QuotationEditor.sections");
  const format = useFormatter();
  const locale = useLocale();
  const str = (value: unknown) => (typeof value === "string" ? value : "");

  function describe(item: QuotationActivityView): string {
    const d = item.detail ?? {};
    const actor = item.actorName;
    switch (item.action) {
      case "CREATED":
        return t("CREATED", { actor });
      case "UPDATED": {
        const total = d.grandTotal as { from?: string; to?: string } | undefined;
        return total?.from && total.to && total.from !== total.to
          ? t("UPDATED_TOTAL", {
              actor,
              from: formatMoney(total.from, { locale, currency }),
              to: formatMoney(total.to, { locale, currency }),
            })
          : t("UPDATED", { actor });
      }
      case "STATUS_CHANGED":
        return t("STATUS_CHANGED", {
          actor,
          from: tStatus(str(d.from) as QuotationStatus),
          to: tStatus(str(d.to) as QuotationStatus),
        });
      case "REVISED":
        return d.to ? t("REVISED_INTO", { actor, number: str(d.to) }) : t("REVISED_FROM", { actor, number: str(d.from) });
      case "ASSIGNED":
        return t("ASSIGNED", { actor, from: str(d.from), to: str(d.to) });
      case "DOCUMENT_EXPORTED":
        return t("DOCUMENT_EXPORTED", { actor, format: str(d.format).toUpperCase() });
    }
  }

  return (
    <Section title={tSections("activity")} description={tSections("activityDescription")} flush>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="min-w-0 text-pretty">{describe(item)}</span>
              <time dateTime={item.createdAt} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function Section({
  title, description, action, children, flush,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </Card>
  );
}

function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function NumberInput({
  value, onChange, disabled, suffix, label, max, className, id,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  suffix?: string;
  label: string;
  max?: number;
  className?: string;
  id?: string;
}) {
  const invalid = value !== "" && (!isValidMoney(value) || money(value).isNegative() || (max !== undefined && money(value).greaterThan(max)));
  return (
    <div dir="ltr" className={cn("relative flex-1", className)}>
      <Input
        id={id}
        inputMode="decimal"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={cn("h-8 tabular-nums", suffix && "pe-11")}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-xs text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}

function LineRow({
  line, index, count, editable, lineTotal, fmt, onChange, onMove, onRemove,
}: {
  line: LineState;
  index: number;
  count: number;
  editable: boolean;
  lineTotal: string;
  fmt: (v: string) => string;
  onChange: (patch: Partial<LineState>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("QuotationEditor");
  const qtyInvalid = safeQty(line.quantity) === 0;
  return (
    <li className="grid gap-3 px-4 py-3 @3xl:grid-cols-[28px_52px_minmax(0,1fr)] @6xl:grid-cols-[28px_52px_minmax(0,1fr)_auto]">
      <span className="hidden pt-2 text-center text-xs text-muted-foreground tabular-nums @3xl:block">{index + 1}</span>
      <div className="hidden @3xl:block">
        {line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={line.imageUrl} alt="" className="size-[52px] rounded-md border bg-muted object-contain" />
        ) : (
          <span aria-hidden className="block size-[52px] rounded-md border border-dashed bg-muted/40" />
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-col gap-2 @md:flex-row">
          <Input
            value={line.name}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={!editable}
            placeholder={t("line.namePlaceholder")}
            aria-label={t("line.name", { position: index + 1 })}
            aria-invalid={!line.name.trim() || undefined}
            className="h-8 font-medium"
            dir="ltr"
          />
          <Input
            value={line.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            disabled={!editable}
            placeholder={t("line.skuPlaceholder")}
            aria-label={t("line.sku", { position: index + 1 })}
            className="h-8 shrink-0 font-mono text-xs @md:w-36"
            dir="ltr"
          />
        </div>
        <Textarea
          value={line.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={!editable}
          rows={2}
          placeholder={t("line.descriptionPlaceholder")}
          aria-label={t("line.description", { position: index + 1 })}
          className="min-h-0 text-xs"
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground">
          {line.productId ? t("line.fromCatalog") : t("line.custom")}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2 @3xl:col-start-3 @6xl:col-start-auto @6xl:flex-nowrap">
        <label className="w-20 space-y-1">
          <span className="block text-xs text-muted-foreground">{t("line.qty")}</span>
          <Input
            inputMode="numeric"
            dir="ltr"
            value={line.quantity}
            onChange={(e) => onChange({ quantity: e.target.value.replace(/\D/g, "") })}
            disabled={!editable}
            aria-invalid={qtyInvalid || undefined}
            className="h-8 tabular-nums"
          />
        </label>
        <label className="w-32 space-y-1">
          <span className="block text-xs text-muted-foreground">{t("line.unitPrice")}</span>
          <NumberInput value={line.unitPrice} onChange={(v) => onChange({ unitPrice: v })} disabled={!editable} label={t("line.unitPrice")} />
        </label>
        <label className="w-20 space-y-1">
          <span className="block text-xs text-muted-foreground">{t("line.discount")}</span>
          <NumberInput value={line.discountPercent} onChange={(v) => onChange({ discountPercent: v })} disabled={!editable} suffix="%" label={t("line.discount")} max={100} />
        </label>
        <div className="min-w-28 space-y-1 text-end">
          <span className="block text-xs text-muted-foreground">{t("line.total")}</span>
          <span className="block pt-1.5 font-semibold whitespace-nowrap tabular-nums">{fmt(lineTotal)}</span>
        </div>
        {editable && (
          <div className="flex items-center pt-5">
            <Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t("line.moveUp", { position: index + 1 })}>
              <ChevronUpIcon aria-hidden className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t("line.moveDown", { position: index + 1 })}>
              <ChevronDownIcon aria-hidden className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={t("line.remove", { position: index + 1 })}>
              <Trash2Icon aria-hidden className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function CustomerPicker({
  customers, value, onChange, disabled,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("QuotationEditor");
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-9 min-w-0 flex-1 justify-between font-normal">
          <span className={cn("truncate", !selected && "text-muted-foreground")} dir="auto">
            {selected?.label ?? t("fields.customerPlaceholder")}
          </span>
          <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("fields.customerSearch")} />
          <CommandList>
            <CommandEmpty>{t("fields.customerEmpty")}</CommandEmpty>
            <CommandGroup>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.label} ${c.phone ?? ""} ${c.email ?? ""}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon aria-hidden className={cn("size-4", c.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate" dir="auto">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProductPicker({
  products, onPick,
}: {
  products: ProductOption[];
  onPick: (product: ProductOption, variant: ProductOption["variants"][number] | null) => void;
}) {
  const t = useTranslations("QuotationEditor");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <PackagePlusIcon aria-hidden className="size-4" />
          {t("addProduct")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,460px)] p-0" align="start">
        {/* Keeps the popover open while adding: quoting ten items is ten picks. */}
        <Command>
          <CommandInput placeholder={t("productSearch")} />
          <CommandList className="max-h-80">
            <CommandEmpty>{t("productEmpty")}</CommandEmpty>
            <CommandGroup>
              {products.flatMap((p) => {
                const variants = p.variants.length > 0 ? p.variants : [null];
                return variants.map((v) => (
                  <CommandItem
                    key={`${p.id}:${v?.id ?? ""}`}
                    value={`${p.sku} ${p.name} ${v?.sku ?? ""} ${v?.label ?? ""}`}
                    onSelect={() => {
                      onPick(p, v);
                      toast.success(t("productAdded", { name: p.name }));
                    }}
                    className="gap-3"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="size-8 shrink-0 rounded-sm border bg-muted object-contain" />
                    ) : (
                      <span aria-hidden className="size-8 shrink-0 rounded-sm border bg-muted" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.name}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
                        {v && p.variants.length > 1 ? `${v.sku} · ${v.label}` : (v?.sku ?? p.sku)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatMoney(v?.price ?? p.price, { locale })}
                    </span>
                  </CommandItem>
                ));
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function NewCustomerDialog({ onCreated }: { onCreated: (c: CustomerOption) => void }) {
  const t = useTranslations("QuotationEditor.newCustomer");
  const tCommon = useTranslations("Common");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const empty = { name: "", companyName: "", phone: "", email: "", taxId: "", address: "" };
  const [form, setForm] = useState(empty);
  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCustomer(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("created"));
      onCreated(result.data);
      setForm(empty);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => setOpen(true)} aria-label={t("open")} title={t("open")}>
        <UserPlusIcon aria-hidden className="size-4" />
      </Button>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${id}-name`} label={t("name")}>
              <Input id={`${id}-name`} required value={form.name} onChange={set("name")} dir="auto" autoFocus />
            </Field>
            <Field id={`${id}-company`} label={t("company")}>
              <Input id={`${id}-company`} value={form.companyName} onChange={set("companyName")} dir="auto" />
            </Field>
            <Field id={`${id}-phone`} label={t("phone")}>
              <Input id={`${id}-phone`} type="tel" value={form.phone} onChange={set("phone")} dir="ltr" />
            </Field>
            <Field id={`${id}-email`} label={t("email")}>
              <Input id={`${id}-email`} type="email" value={form.email} onChange={set("email")} dir="ltr" />
            </Field>
            <Field id={`${id}-tax`} label={t("taxId")}>
              <Input id={`${id}-tax`} value={form.taxId} onChange={set("taxId")} dir="ltr" />
            </Field>
            <Field id={`${id}-address`} label={t("address")} className="sm:col-span-2">
              <Textarea id={`${id}-address`} rows={2} value={form.address} onChange={set("address")} dir="auto" />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending ? tCommon("saving") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
