"use server";

import { prisma, ProductIP } from "@repo/database";
import { serializeRowMoney } from "@/lib/serialize-money";
import { availableIps, calculateIpPriceIncrease } from "@/lib/pricing-rules";
import { priceLine } from "@/lib/pricing";
import { editableConfigurationId } from "@/lib/configuration-access.server";
import { publicConfiguration } from "@/lib/guest-token";

export const updateProductIP = async ({
  configId,
  newProductIp,
}: {
  configId: string;
  newProductIp: ProductIP;
}) => {
  try {
    // Only the visitor's own configuration; anyone else's reads as missing.
    const ownId = await editableConfigurationId(configId);
    const configuration = ownId
      ? await prisma.configuration.findUnique({ where: { id: ownId } })
      : null;

    if (!configuration) {
      return { success: false, error: "Configuration not found" };
    }

    const product = await prisma.product.findUnique({
      where: { productId: configuration.productId },
      select: { price: true, isActive: true, madeToOrder: true, productIp: true, maxIP: true },
    });
    if (!product || !product.isActive) {
      return { success: false, error: "Product not available" };
    }
    // Priced by specification and quantity: quoted by the sales team, never configured here.
    if (product.madeToOrder) {
      return { success: false, error: "Product is made to order" };
    }
    // The ratings the buy box offers, and no other: below the fixture's own
    // rating there is nothing to build, above its maximum nothing to sell.
    if (!availableIps(product.productIp, product.maxIP).includes(newProductIp)) {
      return { success: false, error: "That IP rating is not available for this product" };
    }

    // The upgrade is the step from the product's stored rating — read here,
    // never from the configuration or the browser — to the chosen one.
    const priceIncrease = calculateIpPriceIncrease(product.price, newProductIp, product.productIp);

    // The same assembly as the bulb choice and "order now" (lib/pricing):
    // adding the upgrade to configPrice stacked it on the upgrade already
    // in there and lost the discount, quantity and shipping.
    const pricing = priceLine({
      unitPrice: product.price,
      quantity: configuration.quantity ?? 1,
      priceIncrease,
      lampPriceIncrease: configuration.lampPriceIncrease ?? 0,
      discountRate: configuration.discount,
      shippingPrice: configuration.shippingPrice ?? 69,
    });

    const updatedConfig = await prisma.configuration.update({
      where: { id: configId },
      data: {
        productIp: newProductIp,
        priceIncrease,
        configPrice: pricing.unitConfigPrice,
        totalPrice: pricing.total,
      },
    });
    return { success: true, updatedConfig: serializeRowMoney(publicConfiguration(updatedConfig)) };
  } catch (error) {
    console.error("Error updating product IP:", error);
    return { success: false, error: "Failed to update configuration" };
  }
};
