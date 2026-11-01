"use client";

import { setProductsTrackInventory } from "@/lib/actions/products";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ProductRow } from "./products-table";

/**
 * Stop or start tracking inventory for the selected products — how a whole
 * made-to-order line is marked in one go. Only the button that changes
 * something is offered: all selected already untracked means "track" only.
 */
export function BulkTrackInventory({ selected, clear }: { selected: ProductRow[]; clear: () => void }) {
  const t = useTranslations("Products.bulkTrack");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const anyTracked = selected.some((row) => row.trackInventory);
  const anyUntracked = selected.some((row) => !row.trackInventory);

  const apply = (track: boolean) =>
    startTransition(async () => {
      const result = await setProductsTrackInventory(
        selected.map((row) => row.id),
        track,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t(track ? "tracked" : "untracked", { count: result.data.updated }));
      clear();
      router.refresh();
    });

  return (
    <>
      {anyTracked && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => apply(false)}>
          {t("untrack")}
        </Button>
      )}
      {anyUntracked && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => apply(true)}>
          {t("track")}
        </Button>
      )}
    </>
  );
}
