"use server";

import { prisma } from "@repo/database";
import { bulbPriceIncrease } from "@repo/catalog/bulb-pricing";
import { serializeRowMoney } from "@/lib/serialize-money";
import { priceLine } from "@/lib/pricing";
import { editableConfigurationId } from "@/lib/configuration-access.server";
import { publicConfiguration } from "@/lib/guest-token";

/**
 * Records which bulb a configuration is being bought with.
 *
 * The browser sends a bulb id and nothing else. What that costs is worked
 * out here from the product's own rows — a price posted by the client is a
 * price the client chose.
 *
 * It replaces changeProductChandLamp, which was a deliberate no-op: the old
 * buttons moved a number on screen and wrote nothing, so `lampPriceIncrease`
 * stayed at zero on every configuration ever saved and the customer was
 * charged for a bulb they had not picked.
 */
export const chooseBulb = async ({
  configId,
  bulbId,
}: {
  configId: string;
  bulbId: string;
}) => {
  try {
    // Only the visitor's own configuration; anyone else's reads as missing.
    const ownId = await editableConfigurationId(configId);
    const configuration = ownId ? await prisma.configuration.findUnique({
      where: { id: ownId },
      select: {
        id: true,
        productId: true,
        quantity: true,
        priceIncrease: true,
        shippingPrice: true,
        discount: true,
      },
    }) : null;
    if (!configuration) return { success: false as const, error: "Configuration not found" };

    const product = await prisma.product.findUnique({
      where: { productId: configuration.productId },
      select: {
        price: true,
        hNumber: true,
        isActive: true,
        bulbs: {
          select: { isDefault: true, bulb: { select: { id: true, price: true, isActive: true } } },
        },
      },
    });
    if (!product || !product.isActive) {
      return { success: false as const, error: "Product not available" };
    }

    const offered = product.bulbs.filter((row) => row.bulb.isActive);
    const chosen = offered.find((row) => row.bulb.id === bulbId);
    // A bulb the fixture does not offer is not a price to compute; it is a
    // request to reject.
    if (!chosen) return { success: false as const, error: "That bulb is not available for this product" };

    // The listed price already covers the bulb the fixture is sold with, so
    // only the difference is charged (see @repo/catalog/bulb-pricing).
    const included =
      offered.find((row) => row.isDefault)?.bulb.price ?? chosen.bulb.price;
    const lampPriceIncrease = bulbPriceIncrease(chosen.bulb.price, included, product.hNumber);

    const pricing = priceLine({
      unitPrice: product.price,
      quantity: configuration.quantity ?? 1,
      priceIncrease: configuration.priceIncrease ?? 0,
      lampPriceIncrease,
      discountRate: configuration.discount,
      shippingPrice: configuration.shippingPrice ?? 69,
    });

    const updatedConfig = await prisma.configuration.update({
      where: { id: configId },
      data: {
        bulbId,
        lampPriceIncrease,
        configPrice: pricing.unitConfigPrice,
        totalPrice: pricing.total,
      },
    });

    return { success: true as const, updatedConfig: serializeRowMoney(publicConfiguration(updatedConfig)) };
  } catch (error) {
    console.error("Error choosing bulb:", error);
    return { success: false as const, error: "Failed to update configuration" };
  }
};
