"use server";

import { requireAdmin } from "@/lib/auth";
import { run } from "@/lib/actions/result";
import { OrderStatus, prisma } from "@repo/database";

export const changeOrderStatus = async ({
  id,
  newStatus,
}: {
  id: number;
  newStatus: OrderStatus;
}) =>
  run(async () => {
    // Server actions are public POST endpoints: authorize on every call.
    await requireAdmin();

    await prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });
  });
