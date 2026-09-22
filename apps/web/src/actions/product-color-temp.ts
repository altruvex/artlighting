"use server";

import { prisma, ProductColorTemp } from "@repo/database";
import { editableConfigurationId } from "@/lib/configuration-access.server";

const COLOR_TEMPS = new Set<string>(Object.values(ProductColorTemp));

/**
 * Records the colour temperature a customer chose, on their configuration.
 *
 * This used to update the product row itself — unauthenticated — so every
 * visitor's click changed the product for everyone else, and an order
 * recorded whichever colour was clicked last on the whole site.
 */
export const chooseColorTemp = async ({
  configId,
  colorTemp,
}: {
  configId: string;
  colorTemp: ProductColorTemp;
}): Promise<{ success: boolean }> => {
  if (!COLOR_TEMPS.has(colorTemp)) return { success: false };
  const id = await editableConfigurationId(configId);
  if (!id) return { success: false };
  await prisma.configuration.update({ where: { id }, data: { colorTemp } });
  return { success: true };
};
