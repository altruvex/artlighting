import { requireAdminOrRedirect } from "@/lib/auth";
import { serializeMoney, serializeRate } from "@repo/money";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrderPage, { type OrderDetailData } from "./order-page";

export default async function OrderIdPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdminOrRedirect();

  const { orderId } = await params;
  const id = Number.parseInt(orderId, 10);
  if (!Number.isFinite(id)) return notFound();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      shippingAddress: true,
      product: true,
      user: true,
      configuration: true,
    },
  });

  if (!order || !order.configuration) {
    return notFound();
  }

  const data: OrderDetailData = {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.getTime(),
    updatedAt: order.updatedAt.getTime(),
    expectedAt: order.orderTimeReceived?.getTime() ?? null,
    productName: order.productName,
    productImage: order.productImages[0] ?? null,
    quantity: order.quantity,
    unitPrice: serializeMoney(order.configPrice),
    discountRate: serializeRate(order.discountRate),
    priceIncrease: serializeMoney(order.priceIncrease),
    shippingPrice: serializeMoney(order.shippingPrice),
    total: serializeMoney(order.totalPrice),
    colorTemp: order.productColorTemp || null,
    ipRating: order.configuration.productIp ?? null,
    lamp: order.chandelierLightingType ? order.productChandLamp || null : null,
    brand: order.brand,
    lightingType: order.chandelierLightingType,
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
