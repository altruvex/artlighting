"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { formatMoney } from "@/lib/money";
import { bulbPriceIncrease } from "@repo/catalog/bulb-pricing";
import { money } from "@repo/money";
import { LightbulbIcon, Loader2Icon, PlugZapIcon, PlusIcon, TrashIcon } from "lucide-react";
import {
  createBulb,
  deleteBulb,
  setBulbActive,
  setProductBulbs,
  updateBulb,
} from "@/lib/actions/bulbs";

export interface BulbRow extends Record<string, unknown> {
  id: string;
  key: string;
  wattage: number;
  base: "E27" | "E14";
  /** Serialized money (see @repo/money): never a float. */
  price: string;
  isActive: boolean;
  position: number;
  nameEn: string;
  nameAr: string;
  usedByProducts: number;
  usedByConfigurations: number;
}

export interface FixtureRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  arms: number;
  lightingType: string | null;
  bulbIds: string[];
  defaultBulbId: string | null;
}

type Draft = {
  key: string;
  wattage: string;
  base: "E27" | "E14";
  price: string;
  nameEn: string;
  nameAr: string;
};

const EMPTY: Draft = { key: "", wattage: "", base: "E27", price: "", nameEn: "", nameAr: "" };

/**
 * The price list and the fitting list, on one page.
 *
 * They are one decision: a price here moves every fixture offering that
 * bulb, and a fixture offering none cannot be bought.
 *
 * The price list holds what a bulb costs. The fitting table holds what
 * *choosing* it costs, which is a different number: a fixture's listed
 * price already includes the bulb it is sold with, so the others cost the
 * difference times the arms, and the default itself reads "included".
 */
export function BulbsManager({
  bulbs,
  fixtures,
  locale,
  canWrite,
}: {
  bulbs: BulbRow[];
  fixtures: FixtureRow[];
  locale: string;
  canWrite: boolean;
}) {
  const t = useTranslations("Bulbs");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BulbRow | null>(null);

  const active = useMemo(() => bulbs.filter((bulb) => bulb.isActive), [bulbs]);
  const nameOf = (bulb: BulbRow) => (locale === "ar" ? bulb.nameAr : bulb.nameEn) || bulb.key;

  function report(result: { ok: boolean; error?: string }, success: string) {
    if (!result.ok) {
      toast.error(result.error ?? t("errors.generic"));
      return false;
    }
    toast.success(success);
    return true;
  }

  function submitDraft() {
    const input = {
      key: draft.key.trim(),
      wattage: Number(draft.wattage.trim()),
      base: draft.base,
      price: draft.price.trim(),
      isActive: true,
      position: editing ? (bulbs.find((bulb) => bulb.id === editing)?.position ?? 0) : bulbs.length,
      names: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
    };
    startTransition(async () => {
      const result = editing ? await updateBulb(editing, input) : await createBulb(input);
      if (report(result, editing ? t("saved") : t("created"))) {
        setEditing(null);
        setAdding(false);
        setDraft(EMPTY);
      }
    });
  }

  function beginEdit(bulb: BulbRow) {
    setEditing(bulb.id);
    setAdding(false);
    setDraft({
      key: bulb.key,
      wattage: String(bulb.wattage),
      base: bulb.base,
      price: bulb.price,
      nameEn: bulb.nameEn,
      nameAr: bulb.nameAr,
    });
  }

  function toggleFixtureBulb(fixture: FixtureRow, bulbId: string, on: boolean) {
    const next = on ? [...fixture.bulbIds, bulbId] : fixture.bulbIds.filter((id) => id !== bulbId);
    // A fixture with arms has to be sold with something. When the default is
    // switched off, the first remaining bulb takes over rather than leaving
    // the fixture unbuyable.
    const nextDefault =
      next.length === 0
        ? null
        : next.includes(fixture.defaultBulbId ?? "")
          ? fixture.defaultBulbId
          : (next[0] ?? null);
    startTransition(async () => {
      report(await setProductBulbs(fixture.id, next, nextDefault), t("fixtureSaved"));
    });
  }

  const bulbColumns: AdminColumn<BulbRow>[] = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => `${row.nameEn} ${row.nameAr} ${row.key}`,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.name")} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate font-medium">{nameOf(row.original)}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
              {row.original.key}
            </span>
          </div>
        ),
      },
      {
        id: "wattage",
        meta: { align: "end" },
        accessorFn: (row) => row.wattage,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.wattage")} />,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">{t("watts", { n: row.original.wattage })}</span>
        ),
      },
      {
        id: "base",
        accessorFn: (row) => row.base,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.base")} />,
        filterFn: "arrIncludesSome",
        cell: ({ row }) => (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.base}
          </span>
        ),
      },
      {
        id: "price",
        meta: { align: "end" },
        // Sorts on the number, formats from the string, so no digit is lost.
        accessorFn: (row) => Number(row.price),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.price")} />,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatMoney(row.original.price, { locale })}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "active" : "off"),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.status")} />,
        filterFn: "arrIncludesSome",
        cell: ({ row }) => (
          <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>
            {row.original.isActive ? t("status.active") : t("status.off")}
          </StatusBadge>
        ),
      },
      {
        id: "usage",
        accessorFn: (row) => row.usedByProducts,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.usage")} />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {t("usedBy", {
              products: row.original.usedByProducts,
              configurations: row.original.usedByConfigurations,
            })}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">{t("columns.actions")}</span>,
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => beginEdit(row.original)}>
                {t("edit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const next = !row.original.isActive;
                    report(await setBulbActive(row.original.id, next), next ? t("resumed") : t("stopped"));
                  })
                }
              >
                {row.original.isActive ? t("turnOff") : t("turnOn")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={pending}
                aria-label={t("deleteNamed", { name: nameOf(row.original) })}
                onClick={() => setConfirmDelete(row.original)}
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, canWrite, pending, bulbs],
  );

  const fixtureColumns: AdminColumn<FixtureRow>[] = useMemo(
    () => [
      {
        id: "fixture",
        accessorFn: (row) => `${row.name} ${row.sku}`,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.fixture")} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate font-medium">{row.original.name}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
              {row.original.sku}
            </span>
            {row.original.lightingType !== "lamp" && (
              <StatusBadge tone="warning" className="mt-1">
                {t("fixtures.oddType", { type: row.original.lightingType ?? "—" })}
              </StatusBadge>
            )}
          </div>
        ),
      },
      {
        id: "arms",
        meta: { align: "end" },
        accessorFn: (row) => row.arms,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.arms")} />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.arms}</span>,
      },
      {
        id: "offers",
        enableSorting: false,
        accessorFn: (row) => row.bulbIds.length,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.offers")} />,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {active.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("fixtures.noBulbsYet")}</span>
            ) : (
              active.map((bulb) => {
                // The fixture's price already includes the bulb it is sold
                // with, so what the customer pays is the difference — not
                // the bulb's own price, and not zero.
                const includedPrice =
                  active.find((candidate) => candidate.id === row.original.defaultBulbId)?.price ??
                  bulb.price;
                const adds = bulbPriceIncrease(bulb.price, includedPrice, row.original.arms);
                return (
                  <BulbToggle
                    key={bulb.id}
                    fixtureId={row.original.id}
                    bulbId={bulb.id}
                    label={`${nameOf(bulb)} ${t("watts", { n: bulb.wattage })}`}
                    adds={
                      money(adds).isZero()
                        ? t("fixtures.included")
                        : `${money(adds).isNegative() ? "−" : "+"}${formatMoney(money(adds).abs().toFixed(2), { locale })}`
                    }
                    checked={row.original.bulbIds.includes(bulb.id)}
                    disabled={!canWrite || pending}
                    onToggle={(on) => toggleFixtureBulb(row.original, bulb.id, on)}
                  />
                );
              })
            )}
          </div>
        ),
      },
      {
        id: "soldWith",
        enableSorting: false,
        accessorFn: (row) => row.defaultBulbId ?? "",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.soldWith")} />,
        cell: ({ row }) => {
          const chosen = active.filter((bulb) => row.original.bulbIds.includes(bulb.id));
          if (chosen.length === 0) {
            return <span className="text-xs text-warning">{t("fixtures.needsOne")}</span>;
          }
          return (
            <Select
              value={row.original.defaultBulbId ?? undefined}
              disabled={!canWrite || pending}
              onValueChange={(value) =>
                startTransition(async () => {
                  report(
                    await setProductBulbs(row.original.id, row.original.bulbIds, value),
                    t("fixtureSaved"),
                  );
                })
              }
            >
              <SelectTrigger className="min-w-40" aria-label={t("columns.soldWith")}>
                <SelectValue>
                  {(() => {
                    const bulb = chosen.find((b) => b.id === row.original.defaultBulbId);
                    return bulb ? `${nameOf(bulb)} · ${t("watts", { n: bulb.wattage })}` : undefined;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {chosen.map((bulb) => (
                  <SelectItem key={bulb.id} value={bulb.id}>
                    {nameOf(bulb)} · {t("watts", { n: bulb.wattage })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, canWrite, pending, active],
  );

  return (
    // Two sections set like the dashboard's recent orders — a heading over
    // the table — rather than each table boxed inside a card: the table is
    // already a bordered surface, and a box around a box read as clutter.
    <div className="space-y-8">
      <section aria-labelledby="bulbs-catalogue-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h2 id="bulbs-catalogue-heading" className="text-sm font-semibold">
              {t("catalogue.title")}
            </h2>
            <p className="max-w-[65ch] text-xs text-muted-foreground text-pretty">{t("catalogue.description")}</p>
          </div>
          {canWrite && !adding && !editing && (
            <Button
              size="sm"
              onClick={() => {
                setAdding(true);
                setDraft(EMPTY);
              }}
            >
              <PlusIcon className="size-4" />
              {t("catalogue.add")}
            </Button>
          )}
        </div>
        {(adding || editing) && canWrite && (
          <BulbForm
            draft={draft}
            setDraft={setDraft}
            pending={pending}
            editing={!!editing}
            onSubmit={submitDraft}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
              setDraft(EMPTY);
            }}
          />
        )}

        <DataTable
          columns={bulbColumns}
          data={bulbs}
          searchColumnId="name"
          searchPlaceholder={t("catalogue.search")}
          columnLabels={{
            name: t("columns.name"),
            wattage: t("columns.wattage"),
            base: t("columns.base"),
            price: t("columns.price"),
            status: t("columns.status"),
            usage: t("columns.usage"),
          }}
          emptyState={
            <EmptyState
              icon={LightbulbIcon}
              title={t("catalogue.emptyTitle")}
              description={t("catalogue.empty")}
              action={
                canWrite ? (
                  <Button size="sm" onClick={() => setAdding(true)}>
                    <PlusIcon className="size-4" />
                    {t("catalogue.add")}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </section>

      <section aria-labelledby="bulbs-fixtures-heading" className="space-y-3">
        <div className="min-w-0 space-y-0.5">
          <h2 id="bulbs-fixtures-heading" className="text-sm font-semibold">
            {t("fixtures.title")}
          </h2>
          <p className="max-w-[65ch] text-xs text-muted-foreground text-pretty">{t("fixtures.description")}</p>
        </div>
        <DataTable
          columns={fixtureColumns}
          data={fixtures}
          searchColumnId="fixture"
          searchPlaceholder={t("fixtures.filter")}
          columnLabels={{
            fixture: t("columns.fixture"),
            arms: t("columns.arms"),
            offers: t("columns.offers"),
            soldWith: t("columns.soldWith"),
          }}
          emptyState={
            <EmptyState
              icon={PlugZapIcon}
              title={t("fixtures.emptyTitle")}
              description={t("fixtures.empty")}
            />
          }
        />
      </section>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete.body", { name: confirmDelete ? nameOf(confirmDelete) : "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmDelete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = confirmDelete;
                setConfirmDelete(null);
                if (!target) return;
                startTransition(async () => {
                  report(await deleteBulb(target.id), t("deleted"));
                });
              }}
            >
              {t("confirmDelete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** One bulb offered on one fixture, labelled with what it adds at that arm count. */
function BulbToggle({
  fixtureId,
  bulbId,
  label,
  adds,
  checked,
  disabled,
  onToggle,
}: {
  fixtureId: string;
  bulbId: string;
  label: string;
  adds: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
}) {
  const id = `fit-${fixtureId}-${bulbId}`;
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onToggle(value === true)} />
      <Label htmlFor={id} className="cursor-pointer text-xs font-normal whitespace-nowrap">
        {label}
        <span className="ms-1 tabular-nums text-muted-foreground">{adds}</span>
      </Label>
    </div>
  );
}

function BulbForm({
  draft,
  setDraft,
  pending,
  editing,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  pending: boolean;
  editing: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Bulbs");
  const fieldId = useId();

  // Validated on blur, not only on submit, and cleared as soon as it is right.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors: Record<string, string | undefined> = {
    nameEn: draft.nameEn.trim() ? undefined : t("form.errors.nameEn"),
    nameAr: draft.nameAr.trim() ? undefined : t("form.errors.nameAr"),
    key: /^[a-z0-9_]+$/.test(draft.key.trim()) ? undefined : t("form.errors.key"),
    wattage:
      Number.isInteger(Number(draft.wattage.trim())) && Number(draft.wattage.trim()) > 0
        ? undefined
        : t("form.errors.wattage"),
    price: isMoney(draft.price.trim()) ? undefined : t("form.errors.price"),
  };
  const invalid = Object.values(errors).some(Boolean);

  const show = (field: string) => (touched[field] ? errors[field] : undefined);
  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <form
      className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ nameEn: true, nameAr: true, key: true, wattage: true, price: true });
        if (!invalid) onSubmit();
      }}
      noValidate
    >
      <Field id={`${fieldId}-nameEn`} label={t("form.nameEn")} hint={t("form.nameHint")} error={show("nameEn")}>
        <Input
          id={`${fieldId}-nameEn`}
          value={draft.nameEn}
          dir="ltr"
          onBlur={blur("nameEn")}
          aria-invalid={!!show("nameEn")}
          aria-describedby={describedBy(`${fieldId}-nameEn`, !!show("nameEn"), true)}
          onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })}
        />
      </Field>
      <Field id={`${fieldId}-nameAr`} label={t("form.nameAr")} error={show("nameAr")}>
        <Input
          id={`${fieldId}-nameAr`}
          value={draft.nameAr}
          dir="rtl"
          onBlur={blur("nameAr")}
          aria-invalid={!!show("nameAr")}
          aria-describedby={describedBy(`${fieldId}-nameAr`, !!show("nameAr"))}
          onChange={(event) => setDraft({ ...draft, nameAr: event.target.value })}
        />
      </Field>
      <Field id={`${fieldId}-key`} label={t("form.key")} hint={t("form.keyHint")} error={show("key")}>
        <Input
          id={`${fieldId}-key`}
          value={draft.key}
          dir="ltr"
          className="font-mono"
          disabled={editing}
          onBlur={blur("key")}
          aria-invalid={!!show("key")}
          aria-describedby={describedBy(`${fieldId}-key`, !!show("key"), true)}
          onChange={(event) => setDraft({ ...draft, key: event.target.value })}
        />
      </Field>
      <Field id={`${fieldId}-wattage`} label={t("form.wattage")} error={show("wattage")}>
        <Input
          id={`${fieldId}-wattage`}
          value={draft.wattage}
          inputMode="numeric"
          dir="ltr"
          onBlur={blur("wattage")}
          aria-invalid={!!show("wattage")}
          aria-describedby={describedBy(`${fieldId}-wattage`, !!show("wattage"))}
          onChange={(event) => setDraft({ ...draft, wattage: event.target.value })}
        />
      </Field>
      <Field id={`${fieldId}-base`} label={t("form.base")} hint={t("form.baseHint")}>
        <Select value={draft.base} onValueChange={(value) => setDraft({ ...draft, base: value as "E27" | "E14" })}>
          <SelectTrigger id={`${fieldId}-base`} className="w-full">
            <SelectValue>{draft.base === "E27" ? t("form.e27") : t("form.e14")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="E27">{t("form.e27")}</SelectItem>
            <SelectItem value="E14">{t("form.e14")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field id={`${fieldId}-price`} label={t("form.price")} hint={t("form.priceHint")} error={show("price")}>
        <Input
          id={`${fieldId}-price`}
          value={draft.price}
          inputMode="decimal"
          dir="ltr"
          onBlur={blur("price")}
          aria-invalid={!!show("price")}
          aria-describedby={describedBy(`${fieldId}-price`, !!show("price"), true)}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })}
        />
      </Field>

      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2Icon className="size-4 animate-spin" />}
          {editing ? t("form.save") : t("form.create")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Two decimal places at most, and a real number — the same bar the schema keeps. */
function isMoney(value: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return false;
  try {
    return money(value).greaterThanOrEqualTo(0);
  } catch {
    return false;
  }
}

function describedBy(id: string, hasError: boolean, hasHint = false) {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {/* role=alert, not colour alone: an error a screen reader never
          announces is an error only some people can see (WCAG 1.4.1). */}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
