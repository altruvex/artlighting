"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@repo/database";
import { useMutation } from "@tanstack/react-query";
import { ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeOrderStatus } from "./action";
import { ORDER_STATUSES } from "./order-status";

/**
 * Changes an order's status. The trigger shows the current status by default
 * (order detail); pass `label` for the compact in-table variant, where the
 * status already has its own badge column.
 */
const StatusDropdown = ({
  id,
  orderStatus,
  label,
  className,
}: {
  id: number;
  orderStatus: OrderStatus;
  label?: string;
  className?: string;
}) => {
  const t = useTranslations("OrderStatus");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const tOrders = useTranslations("Orders");
  const { mutate, isPending } = useMutation({
    mutationKey: ["change-order-status"],
    mutationFn: changeOrderStatus,
    onSuccess: (result, variables) => {
      // The action reports failure in its return value, not by throwing — a
      // thrown error loses its message in a production build.
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tOrders("statusChanged", { status: t(variables.newStatus) }));
      router.refresh();
    },
    // Without this a failed change looked exactly like a successful one.
    onError: (error) => {
      console.error("changeOrderStatus failed", error);
      toast.error(tCommon("genericError"));
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          // Rows repeat this control, so the accessible name carries the order.
          aria-label={label ? `${label} #${id}` : undefined}
          className={cn("h-8 w-52 justify-between", className)}
        >
          <span className="truncate">{label ?? t(orderStatus)}</span>
          <ChevronsUpDownIcon aria-hidden className="ms-1 size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {tCommon("status")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={orderStatus}
          onValueChange={(value) => mutate({ id, newStatus: value as OrderStatus })}
        >
          {ORDER_STATUSES.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              <span className={cn(orderStatus === status && "font-medium")}>{t(status)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusDropdown;
