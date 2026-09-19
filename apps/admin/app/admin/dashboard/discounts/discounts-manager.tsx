"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDiscount, deactivateDiscount } from "@/lib/actions/discounts";
import type { DiscountScope, DiscountType } from "@repo/database";
import { TicketPercentIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

export type DiscountState = "active" | "scheduled" | "expired" | "stopped";

export interface DiscountRow extends Record<string, unknown> {
  id: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  code: string | null;
  targetName: string | null;
  state: DiscountState;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

type Category = { id: string; name: string };

const STATE_TONES: Record<DiscountState, StatusTone> = {
  active: "success",
  scheduled: "info",
  expired: "neutral",
  stopped: "neutral",
};

const STATES: DiscountState[] = ["active", "scheduled", "expired", "stopped"];

/**
 * A table, not cards: every discount carries the same six comparable
 * attributes (scope, type, value, code, date window, state), and the job here
 * is scanning down one column — "what is running right now" — which a card
 * grid makes slower, not faster.
 */
export default function DiscountsManager({
  discounts,
  categories,
  isOwner,
}: {
  discounts: DiscountRow[];
  categories: Category[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Discounts");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  const [scope, setScope] = useState<"category" | "global">("global");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [pendingStop, setPendingStop] = useState<DiscountRow | null>(null);

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("genericError"));
      }
    });
  }

  const columns = useMemo<AdminColumn<DiscountRow>[]>(
    () => [
      {
        id: "target",
        accessorFn: (row) => `${row.targetName ?? ""} ${row.code ?? ""} ${row.scope}`,
        filterFn: "includesString",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.target")} />,
        cell: ({ row }) => (
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-medium">
              {row.original.scope === "global"
                ? t("storeWideTarget")
                : (row.original.targetName ?? t(`scope.${row.original.scope}`))}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t(`scope.${row.original.scope}`)}
            </span>
          </span>
        ),
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.type")} />,
        cell: ({ row }) => <span className="text-sm">{t(`type.${row.original.type}`)}</span>,
      },
      {
        id: "value",
        accessorFn: (row) => row.value,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.value")} />,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {row.original.type === "percentage"
              ? format.number(row.original.value / 100, {
                  style: "percent",
                  maximumFractionDigits: 2,
                })
              : format.number(row.original.value, { style: "currency", currency: "EGP" })}
          </span>
        ),
      },
      {
        id: "code",
        accessorFn: (row) => row.code ?? "",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.code")} />,
        cell: ({ row }) =>
          row.original.code ? (
            <code
              dir="ltr"
              className="rounded border bg-muted/50 px-1.5 py-0.5 text-xs font-medium"
            >
              {row.original.code}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground">{t("automatic")}</span>
          ),
      },
      {
        id: "window",
        accessorFn: (row) => row.startsAt?.getTime() ?? 0,
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.window")} />,
        cell: ({ row }) => {
          const { startsAt: from, endsAt: to } = row.original;
          const date = (value: Date) => format.dateTime(value, { dateStyle: "medium" });
          const label = from
            ? to
              ? t("window.range", { from: date(from), to: date(to) })
              : t("window.from", { date: date(from) })
            : to
              ? t("window.until", { date: date(to) })
              : t("window.always");
          return (
            <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {label}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => row.state,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={tCommon("status")} />,
        cell: ({ row }) => (
          <StatusBadge tone={STATE_TONES[row.original.state]}>
            {t(`state.${row.original.state}`)}
          </StatusBadge>
        ),
      },
      {
        id: "created",
        accessorFn: (row) => row.createdAt.getTime(),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.created")} />,
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {format.dateTime(row.original.createdAt, { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) =>
          isOwner && row.original.state !== "stopped" ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => setPendingStop(row.original)}
              >
                {t("deactivate")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, tCommon, format, isOwner, isPending],
  );

  return (
    <div className="space-y-3">
      {isOwner ? (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">{t("newTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("newDescription")}</p>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount-scope">{t("scopeLabel")}</Label>
              <Select
                value={scope}
                onValueChange={(next) => setScope(next as "category" | "global")}
              >
                <SelectTrigger id="discount-scope" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t("scope.global")}</SelectItem>
                  <SelectItem value="category">{t("scope.category")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "category" && (
              <div className="space-y-1.5">
                <Label htmlFor="discount-category">{t("categoryLabel")}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="discount-category" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="discount-type">{t("typeLabel")}</Label>
              <Select
                value={type}
                onValueChange={(next) => setType(next as "percentage" | "fixed")}
              >
                <SelectTrigger id="discount-type" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("type.percentage")}</SelectItem>
                  <SelectItem value="fixed">{t("type.fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-value">{t("valueLabel")}</Label>
              <Input
                id="discount-value"
                className="h-8 tabular-nums"
                type="number"
                inputMode="decimal"
                dir="ltr"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-code">{t("codeLabel")}</Label>
              <Input
                id="discount-code"
                className="h-8"
                dir="ltr"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-starts">{t("startsAtLabel")}</Label>
              <Input
                id="discount-starts"
                className="h-8 tabular-nums"
                type="date"
                dir="ltr"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-ends">{t("endsAtLabel")}</Label>
              <Input
                id="discount-ends"
                className="h-8 tabular-nums"
                type="date"
                dir="ltr"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button
                size="sm"
                disabled={isPending || !value}
                onClick={() =>
                  run(async () => {
                    await createDiscount({
                      type,
                      scope,
                      value: Number(value),
                      code: code || null,
                      categoryId: scope === "category" ? categoryId : null,
                      startsAt: startsAt ? new Date(startsAt) : null,
                      endsAt: endsAt ? new Date(endsAt) : null,
                    });
                    setValue("");
                    setCode("");
                    setStartsAt("");
                    setEndsAt("");
                  }, t("toasts.created"))
                }
              >
                {t("createDiscount")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">{t("ownerOnly")}</p>
      )}

      <DataTable
        columns={columns}
        data={discounts}
        searchColumnId="target"
        searchPlaceholder={t("searchPlaceholder")}
        columnLabels={{
          target: t("columns.target"),
          type: t("columns.type"),
          value: t("columns.value"),
          code: t("columns.code"),
          window: t("columns.window"),
          status: tCommon("status"),
          created: t("columns.created"),
        }}
        facets={[
          {
            columnId: "status",
            title: tCommon("status"),
            options: STATES.map((state) => ({ value: state, label: t(`state.${state}`) })),
          },
          {
            columnId: "type",
            title: t("columns.type"),
            options: [
              { value: "percentage", label: t("type.percentage") },
              { value: "fixed", label: t("type.fixed") },
            ],
          },
        ]}
        emptyState={
          <EmptyState
            icon={TicketPercentIcon}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        }
      />

      <AlertDialog
        open={pendingStop !== null}
        onOpenChange={(open) => !open && setPendingStop(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deactivateDialog.description", {
                target: !pendingStop
                  ? ""
                  : pendingStop.scope === "global"
                    ? t("storeWideTarget")
                    : (pendingStop.targetName ?? t(`scope.${pendingStop.scope}`)),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = pendingStop;
                if (!target) return;
                setPendingStop(null);
                run(() => deactivateDiscount(target.id), t("toasts.deactivated"));
              }}
            >
              {t("deactivateDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
