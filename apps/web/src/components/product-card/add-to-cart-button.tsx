"use client";

import { addToCart } from "@/actions/cart";
import { notifyCartChanged } from "@/lib/cart-events";
import { useAuth } from "@/lib/auth-hooks";
import { cn } from "@/lib/utils";
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

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error(tToast("signInRequired"));
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
    // Above the stretched link, so it adds to the bag rather than opening
    // the product. Always visible on touch, where there is no hover to
    // reveal it.
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isPending || soldOut}
      aria-label={t("addToCartNamed", { name: displayName })}
      className={cn(
        "absolute bottom-3 end-3 z-20 grid size-10 place-items-center rounded-full bg-background/95 text-foreground shadow-[var(--shadow-e2)] backdrop-blur",
        "transition-[transform,opacity,background-color] duration-[var(--dur-hover)] ease-[var(--ease-out)]",
        "hover:bg-primary hover:text-primary-foreground active:scale-95",
        "md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
      ) : (
        <ShoppingBagIcon className="size-4" aria-hidden />
      )}
    </button>
  );
}
