"use client"

import { Badge } from "@repo/ui/components/badge"
import type { ProductFamily } from "@repo/catalog/families";
import { money, multiplyMoney, serializeMoney, subtractMoney, sumMoney } from "@repo/money";
import { priceLine } from "@/lib/pricing";
import { formatNumber, formatPercent } from "@/lib/numbers";
import { Button } from "@repo/ui/components/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet"
import { Separator } from "@repo/ui/components/separator"
import { Skeleton } from "@repo/ui/components/skeleton"
import { PLACEHOLDER_IMAGE } from "@/lib/product-images"
import { useAuth } from "@/lib/auth-hooks"
import { Loader2, ShoppingBag, ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import DiscountPrice from "@/components/price/discount-price"
import NormalPrice from "@/components/price/normal-price"
import { Link, useRouter } from "@/i18n/navigation"
import { checkoutCart } from "@/actions/checkout"
import { orderErrorText } from "@/components/order/order-error"
import { familySlug } from "@repo/catalog/families"
import { onCartChanged } from "@/lib/cart-events"

interface CartItem {
  id: string
  productId: string
  productName: string
  quantity: number
  productImages: string[]
  discount: string
  price: string
  brand: string
  sectionType: ProductFamily
  spotlightType: string
  totalPrice: string
}

/** Rapid +/− clicks are sent once, with the quantity they settle on. */
const QUANTITY_SETTLE_MS = 400

const countOf = (items: CartItem[]) => items.reduce((total, item) => total + item.quantity, 0)

/** The line as the shopper sees it the instant they click, before the server answers. */
function withQuantity(item: CartItem, quantity: number): CartItem {
  return {
    ...item,
    quantity,
    // `discount` is a rate (0.13 = 13%). Dividing it by 100 again
    // charged 0.13% and disagreed with the server's total.
    totalPrice: priceLine({ unitPrice: item.price, quantity, discountRate: item.discount }).total,
  }
}

export function CartSidebar() {
  const { isSignedIn, userId } = useAuth()
  const t = useTranslations("cart")
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  // The badge's number and the drawer's lines are two fetches: the badge
  // needs one integer on every page, the priced cart (products, images,
  // discounts, the pricing engine) only when the drawer is open.
  const [totalItems, setTotalItems] = useState(0)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // The last cart the server confirmed, to fall back on when a change
  // fails; and what the shopper has clicked that the server has not yet
  // confirmed: one pending quantity per line, its timer, the quantity each
  // in-flight request carries, and the lines being removed.
  const serverItemsRef = useRef<CartItem[]>([])
  const pendingRef = useRef(new Map<string, number>())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const inFlightRef = useRef(new Map<string, number>())
  const removingRef = useRef(new Set<string>())
  // Whose cart the requests in flight belong to. A response that lands
  // after the shopper signed out (or in as someone else) is dropped.
  const userIdRef = useRef(userId)
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const hasUnsettledWrites = () =>
    pendingRef.current.size > 0 || inFlightRef.current.size > 0 || removingRef.current.size > 0

  // The server's cart, with the shopper's unconfirmed clicks laid over it:
  // the unsent ones, and the ones another line's request may have been
  // priced before. Two lines' requests in flight together can answer in
  // either order; without this the earlier answer snapped the other line
  // back to its old quantity.
  const showServerCart = useCallback((items: CartItem[]) => {
    serverItemsRef.current = items
    const shown = items
      .filter((item) => !removingRef.current.has(item.id))
      .map((item) => {
        const quantity = pendingRef.current.get(item.id) ?? inFlightRef.current.get(item.id)
        return quantity === undefined ? item : withQuantity(item, quantity)
      })
    setCartItems(shown)
    setTotalItems(countOf(shown))
  }, [])

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setTotalItems(0)
      setCartItems([])
      serverItemsRef.current = []
      // Nothing of the previous shopper's may be laid over the next one's cart.
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
      pendingRef.current.clear()
      inFlightRef.current.clear()
      removingRef.current.clear()
      return
    }

    let cancelled = false

    const fetchCount = async () => {
      try {
        const response = await fetch("/api/cart/count")
        if (!response.ok) return
        const { count } = (await response.json()) as { count: number }
        // A count read while a change is unsent or in flight predates it;
        // the response to that change brings the right number.
        if (!cancelled && !hasUnsettledWrites()) setTotalItems(count)
      } catch (error) {
        console.error("Error counting cart items:", error)
      }
    }

    // Loud when the shopper is looking at the sheet, silent when it is
    // only catching up in the background — a toast about a cart nobody
    // opened is noise.
    const fetchCartItems = async (visible: boolean) => {
      if (visible) setIsLoading(true)
      try {
        const response = await fetch("/api/cart")
        if (!response.ok) {
          const errorData = await response.json()
          console.error("Failed to fetch cart items:", errorData)
          if (visible) toast.error(t("messages.failedToLoad"))
          return
        }
        const items = (await response.json()) as CartItem[]
        if (!cancelled) showServerCart(items)
      } catch (error) {
        console.error("Error fetching cart items:", error)
        if (visible) toast.error(t("messages.errorLoading"))
      } finally {
        if (visible && !cancelled) setIsLoading(false)
      }
    }

    // Opening loads the lines (the skeleton only the first time; after
    // that the known list stays while it refreshes). Closing loads nothing.
    if (isOpen) fetchCartItems(serverItemsRef.current.length === 0)
    else fetchCount()
    // Something else on the page changed the cart (added a product,
    // completed an order): the badge catches up, and the lines too if
    // the shopper is looking at them.
    const stop = onCartChanged(() => (isOpen ? fetchCartItems(false) : fetchCount()))
    return () => {
      cancelled = true
      stop()
    }
  }, [isOpen, isSignedIn, userId, t, showServerCart])

  // A click made just before the header unmounts (a full navigation) is
  // still sent — fire and forget, kept alive past the page — instead of
  // being lost with its timer.
  useEffect(() => {
    const timers = timersRef.current
    const pending = pendingRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      pending.forEach((quantity, itemId) => {
        void fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, quantity }),
          keepalive: true,
        }).catch(() => {})
      })
      pending.clear()
    }
  }, [])

  // Sends a line's settled quantity. The response is the whole cart
  // repriced, so nothing has to be fetched again; clicks made while it
  // was in flight are sent as soon as it returns.
  const flushQuantity = async (itemId: string) => {
    if (inFlightRef.current.has(itemId)) return
    const quantity = pendingRef.current.get(itemId)
    if (quantity === undefined) return
    pendingRef.current.delete(itemId)
    inFlightRef.current.set(itemId, quantity)
    const owner = userIdRef.current
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      })
      if (userIdRef.current !== owner) return
      // This line's answer confirms its own quantity: nothing to lay over.
      inFlightRef.current.delete(itemId)
      if (response.ok) {
        showServerCart((await response.json()) as CartItem[])
        toast.success(t("messages.quantityUpdated"))
      } else {
        pendingRef.current.delete(itemId)
        showServerCart(serverItemsRef.current)
        toast.error(t("messages.failedToUpdate"))
      }
    } catch {
      if (userIdRef.current !== owner) return
      pendingRef.current.delete(itemId)
      showServerCart(serverItemsRef.current)
      toast.error(t("messages.failedToUpdate"))
    } finally {
      inFlightRef.current.delete(itemId)
      if (userIdRef.current === owner && pendingRef.current.has(itemId)) void flushQuantity(itemId)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    // Shown at once; sent when the clicking stops.
    const next = cartItems.map((item) => (item.id === itemId ? withQuantity(item, newQuantity) : item))
    setCartItems(next)
    setTotalItems(countOf(next))
    pendingRef.current.set(itemId, newQuantity)
    const timer = timersRef.current.get(itemId)
    if (timer) clearTimeout(timer)
    timersRef.current.set(
      itemId,
      setTimeout(() => {
        timersRef.current.delete(itemId)
        void flushQuantity(itemId)
      }, QUANTITY_SETTLE_MS),
    )
  }

  const removeItem = async (itemId: string) => {
    // A quantity still waiting to be sent for this line is moot now.
    const timer = timersRef.current.get(itemId)
    if (timer) clearTimeout(timer)
    timersRef.current.delete(itemId)
    pendingRef.current.delete(itemId)
    removingRef.current.add(itemId)
    const next = cartItems.filter((item) => item.id !== itemId)
    setCartItems(next)
    setTotalItems(countOf(next))

    setIsUpdating(itemId)
    const owner = userIdRef.current
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      })

      if (userIdRef.current !== owner) return
      removingRef.current.delete(itemId)
      if (response.ok) {
        // What is left, repriced — a line's removal can change the others' discounts.
        showServerCart((await response.json()) as CartItem[])
        toast.success(t("messages.itemRemoved"))
      } else {
        showServerCart(serverItemsRef.current)
        toast.error(t("messages.failedToRemove"))
      }
    } catch {
      if (userIdRef.current !== owner) return
      removingRef.current.delete(itemId)
      showServerCart(serverItemsRef.current)
      toast.error(t("messages.failedToRemove"))
    } finally {
      setIsUpdating(null)
    }
  }

  const handleCloseSheet = () => {
    setIsOpen(false)
  }

  // The sheet computed this and then never showed it: a cart that adds up
  // to nothing the shopper can see.
  const totalPrice = serializeMoney(sumMoney(cartItems.map((item) => item.totalPrice)))
  const totalSaved = serializeMoney(
    subtractMoney(
      sumMoney(cartItems.map((item) => multiplyMoney(item.price, item.quantity))),
      sumMoney(cartItems.map((item) => item.totalPrice)),
    ),
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-10 lg:size-9 border-border/30 bg-transparent transition-[border-color,background-color] duration-[var(--dur-hover)] hover:border-border hover:bg-accent/5"
          aria-label={t("actions.openCart")}
        >
          <ShoppingCart className="size-4" aria-hidden />
          {totalItems > 0 && (
            <Badge
              className="absolute -top-2 -end-2 h-5 min-w-5 justify-center rounded-full p-0 px-1 text-[length:var(--text-xs)] font-semibold tabular-nums"
            >
              {totalItems > 99
                ? `${formatNumber(99, locale === "ar" ? "ar" : "en")}+`
                : formatNumber(totalItems, locale === "ar" ? "ar" : "en")}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-lg z-50">
        <SheetHeader className="border-b border-border py-5 ps-6 pe-14">
          <SheetTitle className="flex items-center gap-3 text-[length:var(--text-xl)] font-semibold">
            <ShoppingBag className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <span>{t("title")}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="ms-auto px-2.5 py-0.5 text-[length:var(--text-xs)] font-medium tabular-nums">
                {t("count", { count: totalItems, formatted: formatNumber(totalItems, locale === "ar" ? "ar" : "en") })}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!isSignedIn ? (
            <EmptyState
              icon={ShoppingCart}
              title={t("signInRequired.title")}
              description={t("signInRequired.description")}
              action={{ href: "/sign-in", label: tAuth("signIn"), onClick: handleCloseSheet }}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : cartItems.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={t("emptyCart.title")}
              description={t("emptyCart.description")}
              action={{ href: "/products", label: t("emptyCart.continueShopping"), onClick: handleCloseSheet }}
            />
          ) : (
            <>
              <CartItemsList
                items={cartItems}
                isUpdating={isUpdating}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onCloseSheet={handleCloseSheet}
              />
              <CartSummary total={totalPrice} saved={totalSaved} onCloseSheet={handleCloseSheet} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any
  title: string
  description: string
  action?: { href: string; label: string; onClick?: () => void }
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <Icon className="mb-5 size-8 text-muted-foreground" strokeWidth={1.25} aria-hidden />
      <h3 className="mb-2 text-[length:var(--text-lg)] font-semibold">{title}</h3>
      <p className="max-w-xs text-pretty text-[length:var(--text-sm)] text-muted-foreground">{description}</p>
      {/* The link is the button (asChild): a <button> inside an <a> was two
          nested controls, and two tab stops for one action. */}
      {action && (
        <Button asChild className="mt-6 h-10">
          <Link href={action.href} onClick={action.onClick}>
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  )
}

/**
 * What the cart comes to, and the way out of it: one order for everything
 * in it. Each line used to carry its own "order now", with a note telling
 * the customer to buy their products one at a time.
 */
function CartSummary({
  total,
  saved,
  onCloseSheet,
}: {
  total: string
  saved: string
  onCloseSheet: () => void
}) {
  const t = useTranslations("cart")
  const tOrder = useTranslations("order")
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startCheckout] = useTransition()

  const onCheckout = () =>
    startCheckout(async () => {
      const result = await checkoutCart(locale)
      if (!result.ok) {
        toast.error(orderErrorText(tOrder as never, locale, result))
        return
      }
      onCloseSheet()
      router.push(`/confirm?orderId=${result.value.orderId}`)
    })

  return (
    <div className="space-y-3 border-t border-border bg-card/50 px-6 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{t("subtotal")}</span>
        <span className="text-end font-[family-name:var(--font-display-face)] text-[length:var(--text-xl)] font-semibold tabular-nums">
          <NormalPrice price={total} />
        </span>
      </div>
      {money(saved).greaterThan(0) && (
        <p className="flex items-center justify-between gap-4 text-[length:var(--text-sm)] font-medium text-primary">
          <span>{t("saved")}</span>
          <NormalPrice price={saved} className="text-end" />
        </p>
      )}
      <Button onClick={onCheckout} disabled={isPending} className="h-12 w-full text-base font-semibold">
        {isPending ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            {tOrder("checkingOut")}
          </>
        ) : (
          tOrder("checkout")
        )}
      </Button>
      <Button asChild variant="outline" className="h-10 w-full bg-transparent">
        <Link href="/products" onClick={onCloseSheet}>
          {t("continueShopping")}
        </Link>
      </Button>
    </div>
  )
}

function LoadingState() {
  const t = useTranslations("cart")
  // The shape of the rows that are coming, so the drawer does not jump
  // from a centred spinner to a list.
  return (
    <div role="status" className="flex-1 px-6 py-2">
      <span className="sr-only">{t("loading")}</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden className="flex gap-4 border-b border-border py-4 last:border-b-0">
          <Skeleton className="size-24 shrink-0 rounded-sm bg-muted" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-4 w-3/4 rounded-sm bg-muted" />
            <Skeleton className="h-3 w-1/3 rounded-sm bg-muted" />
            <Skeleton className="mt-4 h-4 w-1/2 rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CartItemsList({
  items,
  isUpdating,
  onUpdateQuantity,
  onRemoveItem,
  onCloseSheet,
}: {
  items: CartItem[]
  isUpdating: string | null
  onUpdateQuantity: (id: string, quantity: number) => Promise<void>
  onRemoveItem: (id: string) => Promise<void>
  onCloseSheet: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-2">
      <div className="">
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            isUpdating={isUpdating === item.id}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onCloseSheet={onCloseSheet}
          />
        ))}
      </div>
    </div>
  )
}

function CartItemCard({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemoveItem,
  onCloseSheet,
}: {
  item: CartItem
  isUpdating: boolean
  onUpdateQuantity: (id: string, quantity: number) => Promise<void>
  onRemoveItem: (id: string) => Promise<void>
  onCloseSheet: () => void
}) {
  const t = useTranslations("cart")
  const tShop = useTranslations("shop")
  const locale = useLocale()

  return (
    <div className="group relative border-b border-border py-4 last:border-b-0">
      {/* Remove. It only appeared on hover, and a phone has no hover: on
          the device most of this shop's customers use, there was no way to
          take a product out of the cart. Always visible on touch, revealed
          on hover with a mouse, and visible whenever it has focus. It sits
          at the end of the card, away from the image in either direction. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("actions.remove")}
        title={t("actions.remove")}
        className="absolute end-0 top-2 z-10 size-10 rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-[opacity,background-color,color] duration-[var(--dur-hover)] hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 sm:size-8 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        onClick={() => onRemoveItem(item.id)}
        disabled={isUpdating}
      >
        {isUpdating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
      </Button>

      <div className="flex gap-4">
        {/* Product Image */}
        {/* Always a frame, placeholder or not, so every row's text starts
            on the same line. The rate is a quiet label on the photograph, as
            on the product card — not a filled sticker hanging off its corner. */}
        <div className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-muted">
          <Image
            src={item.productImages?.[0] || PLACEHOLDER_IMAGE}
            alt={item.productName}
            fill
            sizes="96px"
            className="product-photo object-cover"
          />
          {money(item.discount).greaterThan(0) && (
            <span className="absolute start-1.5 top-1.5 rounded-sm bg-background/90 px-1.5 py-0.5 text-[length:var(--text-2xs)] font-semibold tabular-nums text-primary backdrop-blur-sm">
              −{formatPercent(item.discount, locale)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h4 className="line-clamp-2 pe-10 text-[length:var(--text-sm)] font-semibold leading-snug sm:pe-8">
              {item.productName}
            </h4>
            {/* The brand by its name, not its database key: "mister-led"
                and a lowercase model slug were the stored values, printed. */}
            <p className="text-[length:var(--text-xs)] text-muted-foreground">
              {item.brand === "balcom" ? tShop("brand.balcom") : tShop("brand.misterLed")}
            </p>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <DiscountPrice
                price={item.price}
                quantity={item.quantity}
                discount={item.discount}
                className="font-semibold"
              />
              {money(item.discount).greaterThan(0) && (
                <NormalPrice
                  price={item.price}
                  quantity={item.quantity}
                  className="text-[length:var(--text-xs)] text-muted-foreground line-through"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-sm hover:bg-muted sm:size-7"
                  aria-label={t("actions.decrease")}
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= 1}
                >
                  <Minus className="size-3.5" aria-hidden />
                </Button>
                <span className="w-8 text-center text-[length:var(--text-sm)] font-semibold tabular-nums">
                  {formatNumber(item.quantity, locale === "ar" ? "ar" : "en")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-sm hover:bg-muted sm:size-7"
                  aria-label={t("actions.increase")}
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={isUpdating}
                >
                  <Plus className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          </div>

          <Link
            href={`/category/${item.brand}/${familySlug(item.sectionType)}/${item.spotlightType.toLowerCase()}/${item.productId.toLowerCase()}`}
            onClick={onCloseSheet}
            className="mt-2 inline-flex min-h-10 items-center self-start text-[length:var(--text-sm)] font-medium text-primary underline-offset-4 hover:underline sm:mt-3 sm:min-h-0"
          >
            {t("viewProduct")}
          </Link>
        </div>
      </div>
    </div>
  )
}