import { requirePermissionOrRedirect } from "@/lib/auth";
import { serializeMoney } from "@repo/money";
import { prisma } from "@repo/database";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import OrderPage, { type OrderDetailData } from "./order-page";

export default async function OrderIdPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requirePermissionOrRedirect("order:read");

  const { orderId } = await params;
  const id = Number.parseInt(orderId, 10);
  if (!Number.isFinite(id)) return notFound();
  const locale = await getLocale();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      shippingAddress: {
        select: {
          fullName: true,
          phoneNumber: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
        },
      },
      user: { select: { id: true, email: true } },
      orderItems: {
        orderBy: { id: "asc" },
        include: {
          bulb: { select: { wattage: true, translations: { where: { language: locale }, select: { name: true } } } },
        },
      },
    },
  });

  // An order without a configuration is still an order; it used to 404
  // here, which hid it from the one person who has to ship it.
  if (!order) {
    return notFound();
  }

  const data: OrderDetailData = {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.getTime(),
    updatedAt: order.updatedAt.getTime(),
    expectedAt: order.orderTimeReceived?.getTime() ?? null,
    // Every product in the order, with the figures stored when it was
    // placed — not recomputed from a rate and a unit price.
    lines: order.orderItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      productImage: item.productImages[0] ?? null,
      quantity: item.quantity,
      unitPrice: serializeMoney(item.configPrice),
      discountAmount: serializeMoney(item.discountAmount),
      lineTotal: serializeMoney(item.lineTotal),
      colorTemp: item.productColorTemp,
      ipRating: item.productIp,
      bulb: item.bulb ? (item.bulb.translations[0]?.name ?? `${item.bulb.wattage} W`) : null,
      brand: item.brand,
    })),
    subtotal: serializeMoney(order.subtotal),
    discountTotal: serializeMoney(order.discountTotal),
    shippingPrice: serializeMoney(order.shippingPrice),
    total: serializeMoney(order.totalPrice),
    customer: {
      id: order.user.id,
      email: order.user.email,
    },
    shipping: order.shippingAddress
      ? {
          fullName: order.shippingAddress.fullName,
          phoneNumber: order.shippingAddress.phoneNumber,
          address: order.shippingAddress.address,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zipCode: order.shippingAddress.zipCode,
          country: order.shippingAddress.country,
        }
      : null,
  };

  return <OrderPage order={data} />;
}
