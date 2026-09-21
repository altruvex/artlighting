"use client"

import { Badge } from "@/components/ui/badge"
import type { ProductFamily } from "@repo/catalog/families";
import { money, type MoneyInput, serializeMoney, sumMoney } from "@repo/money";
import { priceLine } from "@/lib/pricing";
import { formatPercent } from "@/lib/numbers";
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-hooks"
import { Loader2, ShoppingBag, ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import DiscountPrice from "./discount-price"
import NormalPrice from "./normal-price"
import { Link } from "@/i18n/navigation"
import { notifyCartChanged, onCartChanged } from "@/lib/cart-events"

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

export function CartSidebar() {
  const { isSignedIn, userId } = useAuth()
  const t = useTranslations("cart")
  const [isOpen, setIsOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setCartItems([])
      return
    }

    let cancelled = false
    // Loud when the shopper is looking at the sheet, silent when this is
    // only the badge catching up in the background — a toast about a cart
    // nobody opened is noise.
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
        const items = await response.json()
        if (!cancelled) setCartItems(items)
      } catch (error) {
        console.error("Error fetching cart items:", error)
        if (visible) toast.error(t("messages.errorLoading"))
      } finally {
        if (visible && !cancelled) setIsLoading(false)
      }
    }

    fetchCartItems(isOpen)
    const stop = onCartChanged(() => fetchCartItems(false))
    return () => {
      cancelled = true
      stop()
    }
  }, [isOpen, isSignedIn, userId, t])

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const previousItems = [...cartItems]
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
            ...item,
            quantity: newQuantity,
            // `discount` is a rate (0.13 = 13%). Dividing it by 100 again
            // charged 0.13% and disagreed with the server's total.
            totalPrice: priceLine({ unitPrice: item.price, quantity: newQuantity, discountRate: item.discount }).total,
          }
          : item,
      ),
    )

    setIsUpdating(itemId)
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setCartItems((prevItems) => prevItems.map((item) => (item.id === itemId ? updatedItem : item)))
        localStorage.setItem(`quantity-${itemId}`, newQuantity.toString())
        notifyCartChanged()
        toast.success(t("messages.quantityUpdated"))
      } else {
        setCartItems(previousItems)
        toast.error(t("messages.failedToUpdate"))
      }
    } catch {
      setCartItems(previousItems)
      toast.error(t("messages.failedToUpdate"))
    } finally {
      setIsUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    const previousItems = [...cartItems]
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId))

    setIsUpdating(itemId)
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        localStorage.removeItem(`quantity-${itemId}`)
        notifyCartChanged()
        toast.success(t("messages.itemRemoved"))
      } else {
        setCartItems(previousItems)
        toast.error(t("messages.failedToRemove"))
      }
    } catch {
      setCartItems(previousItems)
      toast.error(t("messages.failedToRemove"))
    } finally {
      setIsUpdating(null)
    }
  }

  const handleCloseSheet = () => {
    setIsOpen(false)
  }

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = serializeMoney(sumMoney(cartItems.map((item) => item.totalPrice)))

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 border-border/30 hover:border-border hover:bg-accent/5 transition-all bg-transparent"
          aria-label={t("actions.openCart")}
        >
          <ShoppingCart className="h-4 w-4" />
          {totalItems > 0 && (
            <Badge
              className="absolute -top-2 -end-2 h-5 min-w-5 justify-center rounded-full p-0 px-1 text-[length:var(--text-xs)] font-semibold tabular-nums"
            >
              {totalItems > 99 ? "99+" : totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-lg z-50">
        <SheetHeader className="border-b border-border/50 px-6 py-5 bg-gradient-to-b from-background to-muted/20">
          <SheetTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <span>{t("title")}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="ms-auto px-3 py-1 text-[length:var(--text-sm)] font-semibold">
                {t("count", { count: totalItems })}
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
            />
          ) : isLoading ? (
            <LoadingState />
          ) : cartItems.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t("emptyCart.title")} description={t("emptyCart.description")} />
          ) : (
            <>
              <CartItemsList
                items={cartItems}
                isUpdating={isUpdating}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onCloseSheet={handleCloseSheet}
              />
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
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-inner">
        <Icon className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  )
}

function LoadingState() {
  const t = useTranslations("cart")
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">{t("loading")}</p>
      </div>
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
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-3">
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
  const locale = useLocale()

  return (
    <div className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground z-10"
        onClick={() => onRemoveItem(item.id)}
        disabled={isUpdating}
      >
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>

      <div className="flex gap-4">
        {/* Product Image */}
        {item.productImages?.[0] && (
          <div className="relative shrink-0 w-24 h-24">
            <Image
              src={item.productImages[0] || "/placeholder.svg"}
              alt={item.productName}
              fill
              className="object-cover rounded-lg shadow-sm"
            />
            {money(item.discount).greaterThan(0) && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -left-2 text-xs px-2 py-1 font-bold shadow-md"
              >
                -{formatPercent(item.discount, locale)}
              </Badge>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 pr-8">
              {item.productName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{item.brand}</span>
              <span>•</span>
              <span>{item.spotlightType}</span>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-baseline gap-2">
              <DiscountPrice
                price={item.price}
                quantity={item.quantity}
                discount={item.discount}
              />
              {money(item.discount).greaterThan(0) && (
                <NormalPrice
                  price={item.price}
                  quantity={item.quantity}
                  className="text-xs text-muted-foreground line-through"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-background"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={isUpdating || item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-background"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={isUpdating}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <Link
              href={`/category/${item.brand}/${item.sectionType}/${item.spotlightType.toLowerCase()}/${item.productId.toLowerCase()}`}
              className="flex-1"
              onClick={onCloseSheet}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-medium h-9 hover:bg-muted"
              >
                {t("viewProduct")}
              </Button>
            </Link>
            <Link
              href={`/preview/${item.productId}`}
              className="flex-1"
              onClick={onCloseSheet}
            >
              <Button
                size="sm"
                className="w-full text-xs font-semibold h-9 shadow-sm"
              >
                {t("orderNow")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}