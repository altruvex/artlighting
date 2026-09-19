
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrderPage from "./order-page";

const OrderIdPage = async ({ params }: { params: Promise<{ orderId: string }> }) => {
  await requireAdminOrRedirect();
  const resolvedParams = await params;
  const order = await prisma.order.findUnique({
    where: {
      id: parseInt(resolvedParams.orderId),
    },
    include: {
      shippingAddress: true,
      product: true,
      user: true,
      configuration: true
    },
  });
  if (!order || !order.configuration) {
    return notFound();
  }
  const orderWithConfig = {
    ...order,
    configuration: order.configuration,
  };
  return <OrderPage order={orderWithConfig} />;
};

export default OrderIdPage;
