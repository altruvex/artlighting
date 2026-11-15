"use client";

import { addToCart } from "@/actions/cart";
import { usePathname, useRouter } from "@/i18n/navigation";
import { notifyCartChanged } from "@/lib/cart-events";
import { useAuth } from "@/lib/auth-hooks";
import {
  currentReturnPath,
  savePendingAdd,
  signInPath,
} from "@/lib/pending-cart";
import { Button } from "@repo/ui/components/button";
import { Loader2Icon, ShoppingBagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * The card's one action that is not a link. The only part of a product
 * card that needs the browser, so it is the only part shipped to it: the
 * card around it renders on the server.
 */
export function AddToCartButton({
  productId,
  displayName,
  soldOut,
}: {
  productId: string;
  displayName: string;
  soldOut: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { isSignedIn } = useAuth();
  const t = useTranslations("product-card");
  const tToast = useTranslations("toast");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();

  const handleAddToCart = () => {
    if (!isSignedIn) {
      // The tap is kept, not refused: the intent is saved for after sign-in
      // (completed by PendingCartResumer) and the toast offers the way there,
      // with this page — filters and all — as the way back.
      savePendingAdd({ productId, productName: displayName, quantity: 1 });
      const returnTo = currentReturnPath(pathname);
      toast(tToast("signInRequired"), {
        id: "pending-add",
        description: tToast("addAfterSignIn"),
        action: {
          label: tAuth("signIn"),
          onClick: () => router.push(signInPath(returnTo)),
        },
      });
      return;
    }
    startTransition(async () => {
      try {
        await addToCart(productId);
        notifyCartChanged();
        toast.success(tToast("addToCartSuccess", { productName: displayName }));
      } catch (error) {
        console.error("Cart addition failed:", error);
        toast.error(tToast("addToCartError"));
      }
    });
  };

  return (
    // Above the stretched link (z-20), so it adds to the bag rather than
    // opening the product. Outline at rest, gold on hover: visible, not loud.
    <Button
      type="button"
      variant="outline"
      onClick={handleAddToCart}
      disabled={isPending || soldOut}
      aria-label={
        soldOut ? undefined : t("addToCartNamed", { name: displayName })
      }
      className="relative z-20 min-h-11 w-full gap-1.5 px-2 hover:border-primary hover:bg-primary hover:text-primary-foreground"
    >
      {isPending ? (
        <Loader2Icon
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        <ShoppingBagIcon className="size-4" aria-hidden />
      )}
      <span className="truncate">
        {soldOut ? t("soldOut") : t("addToCart")}
      </span>
    </Button>
  );
}
