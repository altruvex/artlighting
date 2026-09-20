"use client";

import { receiveStock, setCountedStock, stockHistory } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ClipboardCheckIcon, HistoryIcon, PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import type { StockMovementKind } from "@repo/catalog";

/** One ledger row, as the history dialog needs it. */
interface Movement {
  id: string;
  kind: StockMovementKind;
  quantity: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string | null;
  orderId: number | null;
  actorId: string | null;
  createdAt: Date;
}

/**
 * Receive, count and history for one variant.
 *
 * A receipt and a count are deliberately different actions rather than one
 * "set stock" box: they mean different things, they produce different ledger
 * rows, and an admin who has just counted a shelf should not have to work
 * out the difference themselves.
 */
export function StockActions({
  variantId,
  sku,
  onHand,
  canWrite,
}: {
  variantId: string;
  sku: string;
  onHand: number;
  canWrite: boolean;
}) {
  const t = useTranslations("Inventory");
  const format = useFormatter();
  const router = useRouter();
  const fieldId = useId();

  const [open, setOpen] = useState<null | "receive" | "count" | "history">(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(null);
    setQuantity("");
    setReason("");
    setMovements(null);
  }

  function submitReceive() {
    startTransition(async () => {
      const result = await receiveStock(variantId, Number(quantity), reason.trim() || undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("received", { count: Number(quantity) }));
      close();
      router.refresh();
    });
  }

  function submitCount() {
    startTransition(async () => {
      const result = await setCountedStock(variantId, Number(quantity), reason.trim() || undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Null means the count agreed with the system, so nothing was written
      // — worth saying, rather than a success toast for a no-op.
      toast.success(result.data === null ? t("noChange") : t("counted"));
      close();
      router.refresh();
    });
  }

  function openHistory() {
    setOpen("history");
    startTransition(async () => {
      const result = await stockHistory(variantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMovements(result.data as Movement[]);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canWrite && (
        <>
          <Button size="sm" variant="ghost" onClick={() => setOpen("receive")} aria-label={t("receive")}>
            <PlusIcon aria-hidden className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen("count")} aria-label={t("count")}>
            <ClipboardCheckIcon aria-hidden className="size-4" />
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={openHistory} aria-label={t("history")}>
        <HistoryIcon aria-hidden className="size-4" />
      </Button>

      <Dialog open={open !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent className={cn(open === "history" && "max-w-3xl")}>
          {open === "history" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("historyTitle")}</DialogTitle>
                <DialogDescription dir="ltr">{sku}</DialogDescription>
              </DialogHeader>

              {movements && movements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("historyEmpty")}</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr>
                        <th scope="col" className="p-2 text-start font-medium">{t("movementColumns.when")}</th>
                        <th scope="col" className="p-2 text-start font-medium">{t("movementColumns.what")}</th>
                        <th scope="col" className="p-2 text-end font-medium">{t("movementColumns.change")}</th>
                        <th scope="col" className="p-2 text-end font-medium">{t("movementColumns.after")}</th>
                        <th scope="col" className="p-2 text-start font-medium">{t("movementColumns.who")}</th>
                        <th scope="col" className="p-2 text-start font-medium">{t("movementColumns.why")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movements ?? []).map((movement) => (
                        <tr key={movement.id} className="border-t align-top">
                          <td className="whitespace-nowrap p-2 text-muted-foreground">
                            {format.dateTime(new Date(movement.createdAt), { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="p-2">{t(`kinds.${movement.kind}` as const)}</td>
                          <td
                            className={cn(
                              "p-2 text-end tabular-nums font-medium",
                              movement.quantity > 0 ? "text-success" : "text-danger",
                            )}
                            dir="ltr"
                          >
                            {movement.quantity > 0 ? "+" : ""}
                            {format.number(movement.quantity)}
                          </td>
                          <td className="p-2 text-end tabular-nums">{format.number(movement.onHandAfter)}</td>
                          <td className="p-2 text-muted-foreground" dir="ltr">{movement.actorId ?? "—"}</td>
                          <td className="p-2 text-muted-foreground">{movement.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t("cancel")}</Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{open === "receive" ? t("receiveTitle") : t("countTitle")}</DialogTitle>
                <DialogDescription>
                  {open === "receive" ? t("receiveDescription") : t("countDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${fieldId}-qty`}>
                    {open === "receive" ? t("quantityLabel") : t("countedLabel")}
                  </Label>
                  <Input
                    id={`${fieldId}-qty`}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={open === "count" ? String(onHand) : "10"}
                    className="tabular-nums"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${fieldId}-reason`}>{t("reasonLabel")}</Label>
                  <Input
                    id={`${fieldId}-reason`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t("reasonPlaceholder")}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" disabled={isPending}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  onClick={open === "receive" ? submitReceive : submitCount}
                  disabled={isPending || quantity.trim() === ""}
                >
                  {t("save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
