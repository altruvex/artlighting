"use server";

import { auth } from "@/lib/auth-server";
import { readGuestToken } from "@/lib/guest-token";
import { productPersonalState, type ProductPersonalState } from "@/lib/product-personal.server";
import { ProductService } from "@/lib/services/product.service";

/**
 * The visitor's configuration for this product, created on first use.
 *
 * Called by the buy box the first time the customer picks an option or
 * orders — not by the page render, which only reads (see
 * lib/configuration.server.ts). Returns just the id: what the page shows
 * already reflects the defaults the new row starts from.
 */
export async function ensureConfiguration(productCode: string, locale: string): Promise<{ id: string } | null> {
  if (typeof productCode !== "string" || productCode.length === 0 || productCode.length > 120) return null;
  const [{ userId }, guestToken] = await Promise.all([auth(), readGuestToken()]);
  // Anonymous rows are owned through the guest cookie; without it nobody
  // could edit the row afterwards, so there is nothing worth creating.
  if (!userId && !guestToken) return null;

  const product = await ProductService.getLocalizedProductDetail(productCode, locale === "ar" ? "ar" : "en", {
    isActive: true,
  });
  if (!product) return null;

  const configuration = await ProductService.getOrCreateConfiguration(product, userId, guestToken);
  return { id: configuration.id };
}

/**
 * Who is looking at a product page: their saved configuration and their own
 * review. The page itself is prerendered and identical for every visitor;
 * the browser asks for this after it loads (ProductDetail). Streaming it
 * into the page instead made Next send the page's whole payload twice.
 */
export async function productPersonal(productCode: string): Promise<ProductPersonalState | null> {
  if (typeof productCode !== "string" || productCode.length === 0 || productCode.length > 120) return null;
  return productPersonalState(productCode);
}
