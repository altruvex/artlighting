"use client";

import { addToCart } from "@/actions/cart";
import { useAuth } from "@/lib/auth-hooks";
import { notifyCartChanged } from "@/lib/cart-events";
import { takePendingAdd } from "@/lib/pending-cart";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Finishes the add-to-cart a guest started before signing in.
 *
 * Mounted once in the storefront layout, it renders nothing. When the
 * session arrives signed in and lib/pending-cart holds a fresh intent, it
 * adds the product the same way the buttons do — the same action, the same
 * cart-changed event for the header badge, the same toasts — and the intent
 * is cleared before the call, so neither a re-render nor StrictMode's second
 * effect run can add it twice.
 */
export function PendingCartResumer() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useTranslations("toast");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const pending = takePendingAdd();
    if (!pending) return;
    // The toasts are global, so no "still mounted" guard: a re-run of this
    // effect finds the intent already taken and does nothing.
    addToCart(pending.productId, pending.quantity)
      .then(() => {
        notifyCartChanged();
        toast.success(t("addToCartSuccess", { productName: pending.productName }));
      })
      .catch(() => {
        toast.error(t("addToCartError"));
      });
  }, [isLoaded, isSignedIn, t]);

  return null;
}
