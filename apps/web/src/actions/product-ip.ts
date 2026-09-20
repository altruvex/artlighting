"use server";

import { prisma, ProductIP } from "@repo/database";
import { addMoney, serializeMoney } from "@repo/money";
import { serializeRowMoney } from "@/lib/serialize-money";
import { calculateIpPriceIncrease } from "@/lib/pricing-rules";

export const updateProductIP = async ({
  configId,
  newProductIp,
}: {
  configId: string;
  newProductIp: ProductIP;
}) => {
  try {
    const configuration = await prisma.configuration.findUnique({
      where: { id: configId },
    });

    if (!configuration) {
      console.error(`Configuration not found for ID: ${configId}`);
      return { success: false, error: "Configuration not found" };
    }

    const product = await prisma.product.findUnique({
      where: { productId: configuration.productId },
      select: { price: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return { success: false, error: "Product not available" };
    }

    // Decimal arithmetic: the IP upgrade is added to the stored unit price.
    const priceIncrease = calculateIpPriceIncrease(product.price, newProductIp);
    const updatedTotalPrice = addMoney(configuration.configPrice, priceIncrease);

    const updatedConfig = await prisma.configuration.update({
      where: { id: configId },
      data: {
        productIp: newProductIp,
        priceIncrease,
        totalPrice: serializeMoney(updatedTotalPrice),
      },
    });
    return { success: true, updatedConfig: serializeRowMoney(updatedConfig) };
  } catch (error) {
    console.error("Error updating product IP:", error);
    return { success: false, error: "Failed to update configuration" };
  }
};
