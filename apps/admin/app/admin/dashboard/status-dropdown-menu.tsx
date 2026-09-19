"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@repo/database";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeOrderStatus } from "./action";

// Plain string literals, not Object.values(OrderStatus) — importing the
// Prisma enum as a runtime value here would pull the entire @repo/database
// module (including the live PrismaClient instantiation) into this
// "use client" bundle, which crashes since Prisma can't run in a browser.
const ORDER_STATUSES: OrderStatus[] = [
  "awaiting_shipment",
  "processing",
  "cancelled",
  "fulfilled",
  "shipped",
  "delivered",
  "refunded",
];

const StatusDropdown = ({
  id,
  orderStatus,
}: {
  id: number;
  orderStatus: OrderStatus;
}) => {
  const t = useTranslations("OrderStatus");
  const router = useRouter();
  const { mutate } = useMutation({
    mutationKey: ["change-order-status"],
    mutationFn: changeOrderStatus,
    onSuccess: () => router.refresh(),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="w-52 flex justify-between items-center text-foreground bg-background border-border hover:bg-accent hover:text-accent-foreground"
          variant="outline"
        >
          {t(orderStatus)}
          <ChevronsUpDown className="ms-2 w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-popover text-popover-foreground border-border w-52">
        {ORDER_STATUSES.map((status) => (
          <DropdownMenuItem
            onClick={() => mutate({ id, newStatus: status as OrderStatus })}
            key={status}
            className={cn(
              "flex text-sm gap-1 items-center p-2.5 cursor-default",
              "hover:bg-accent hover:text-accent-foreground",
              {
                "bg-secondary text-secondary-foreground":
                  orderStatus === status,
              },
            )}
          >
            <Check
              className={cn("me-2 h-4 w-4", {
                "text-primary": orderStatus === status,
                "opacity-0": orderStatus !== status,
              })}
            />
            {t(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusDropdown;
