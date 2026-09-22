"use client"

import { addToCart } from "@/actions/cart"
import { updateProductIP } from "@/actions/product-ip"
import { saveConfig as _saveConfig, type SaveConfigArgs } from "@/actions/save-config"
import DiscountPrice from "@/components/price/discount-price"
import NormalPrice from "@/components/price/normal-price"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth-hooks"
import { notifyCartChanged } from "@/lib/cart-events"
import { formatNumber, formatPercent } from "@/lib/numbers"
import { SHOWROOM_PHONE } from "@/lib/showroom"
import { cn } from "@/lib/utils"
import { ProductIP, type Configuration, type SupportedCurrency } from "@/types/products"
import type { BulbChoice } from "@repo/catalog/bulb-pricing"
import type { ProductFamily } from "@repo/catalog/families"
import type { ProductIP as PrismaProductIP, ProductColorTemp } from "@repo/database"
import { addMoney, applyRate, clampNonNegative, money, multiplyMoney, serializeMoney, subtractMoney } from "@repo/money"
import { useMutation } from "@tanstack/react-query"
import { BanknoteIcon, Loader2, ShoppingBag, TruckIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useDebounce } from "use-debounce"
import BulbOptions from "./bulb-options"
import ColorTempOptions from "./color-temp-options"
import IpOptions from "./ip-options"
import { QuantitySelector } from "./quantity-selector"
import { StarRating, ratingLabel } from "./star-rating"

const PRODUCTS_WITH_IP20_TEXT = ["product-jy-810-10w", "product-jy-810-12w", "product-jy-810-18w", "product-jy-810-30w"]
const PRODUCTS_WITH_MAX_IP_TEXT = ["product-jy-913-5w", "product-jy-913-8w", "product-jy-913-12w", "product-jy-913-18w"]
const DEBOUNCE_DELAY = 300
const BULK_ORDER_THRESHOLD = 10
/** The same line the product cards draw for "only N left". */
const LOW_STOCK = 5

export interface BuyBoxProps {
  productName: string
  /** Serialized money (see @repo/money): never a float. */
  price: string
  productId: string
  configId?: string
  /** Rate, not percent: 0.13 = 13%. */
  discount: string
  brand: string
  /** Priced for this fixture's arms; empty when it has none. */
  bulbChoices?: BulbChoice[]
  /** The lighting type's name in this locale, shown above the title. */
  lightingTypeName?: string
  /** One line under the title, built from the catalogue. */
  shortDescription: string
  configuration?: Configuration
  /** The rating the customer starts on. */
  ip?: PrismaProductIP
  /** The fixture's own rating — the floor the customer upgrades from. */
  baseIp?: PrismaProductIP
  maxIP?: number
  sectionType: ProductFamily
  /** The product's default colour temperature, when the customer has not chosen one. */
  defaultColorTemp: ProductColorTemp
  /** Units a customer may buy; null when the product is not tracked (no limit). */
  stock: number | null
  /** The average of this product's reviews, or null with none yet. */
  ratingAverage: number | null
  ratingCount: number
}

/**
 * Everything a shopper decides on, beside the photographs: what it is,
 * what it costs now, the options that change that cost, how many, and
 * the two ways to buy it.
 *
 * The price sits above the options and moves as they are chosen — the
 * upgrade a shopper is weighing is priced in the same figure they will be
 * charged. On a phone the buttons ride along at the bottom of the screen.
 */
export default function BuyBox({
  productName,
  price,
  productId,
  configId,
  discount,
  brand,
  bulbChoices = [],
  lightingTypeName,
  shortDescription,
  configuration: initialConfiguration,
  ip,
  baseIp,
  maxIP,
  sectionType,
  defaultColorTemp,
  stock,
  ratingAverage,
  ratingCount,
}: BuyBoxProps) {
  const t = useTranslations("product-main-info")
  const tPdp = useTranslations("pdp")
  const tNotification = useTranslations("product-notifications")
  const tDialog = useTranslations("product-dialog")
  const router = useRouter()
  const locale = useLocale()

  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isClicked, setIsClicked] = useState(false)
  const [configuration, setConfiguration] = useState<Configuration | undefined>(initialConfiguration)

  const [selectedColorTemp, setSelectedColorTemp] = useState<ProductColorTemp>(
    initialConfiguration?.colorTemp ?? defaultColorTemp,
  )

  const [selectedProductIp, setSelectProductIp] = useState<PrismaProductIP>(
    (initialConfiguration?.productIp as unknown as PrismaProductIP) ?? ip ?? "IP20",
  )

  // Which bulb, not which of two hard-coded wattages. The fixture is sold
  // with one, so the default stands until the customer picks another.
  const [selectedBulbId, setSelectedBulbId] = useState<string | undefined>(
    configuration?.bulbId ?? bulbChoices.find((choice) => choice.isDefault)?.id,
  )

  // Money as serialized strings; see @repo/money. Both start from the saved
  // configuration, not zero: the IP and the bulb are restored on load, and
  // starting the amounts at zero showed the upgrade picked at the base price.
  const [priceIncrease, setPriceIncrease] = useState<string>(initialConfiguration?.priceIncrease ?? "0")
  const [lampPriceIncrease, setLampPriceIncrease] = useState<string>(configuration?.lampPriceIncrease ?? "0")

  const { isSignedIn } = useAuth()
  // What the server currently holds for the IP, so neither effect below
  // writes a value it already has.
  const appliedIpRef = useRef<string | undefined>(initialConfiguration?.productIp as string | undefined)
  const isUpdatingRef = useRef(false)
  const lastUpdateRef = useRef<string>("")

  const [debouncedProductIp] = useDebounce(selectedProductIp, DEBOUNCE_DELAY)

  const soldOut = stock === 0
  const hasDiscount = money(discount).greaterThan(0)

  const totalPriceBeforeDiscount = useMemo(
    () => serializeMoney(addMoney(price, priceIncrease, lampPriceIncrease)),
    [price, priceIncrease, lampPriceIncrease],
  )

  // `discount` is a rate (0.13 = 13%), applied in Decimal.
  const discountedUnitPrice = useMemo(
    () => serializeMoney(clampNonNegative(subtractMoney(totalPriceBeforeDiscount, applyRate(totalPriceBeforeDiscount, discount)))),
    [totalPriceBeforeDiscount, discount],
  )

  /** What the discount takes off this configuration, at this quantity. */
  const savingTotal = useMemo(
    () => serializeMoney(multiplyMoney(subtractMoney(totalPriceBeforeDiscount, discountedUnitPrice), quantity)),
    [totalPriceBeforeDiscount, discountedUnitPrice, quantity],
  )

  // The price animates when it changes, not when the page arrives.
  const priceKey = `${discountedUnitPrice}-${quantity}`
  const [firstPriceKey] = useState(priceKey)

  const showIP20Text = PRODUCTS_WITH_IP20_TEXT.includes(productId)
  const showMaxIpText = PRODUCTS_WITH_MAX_IP_TEXT.includes(productId)
  const showOutdoorText = sectionType === "OUTDOOR"

  const handleBulbChange = useCallback((bulbId: string, newLampPriceIncrease: string) => {
    setSelectedBulbId(bulbId)
    setLampPriceIncrease(newLampPriceIncrease)
  }, [])

  const handleProductIPChange = useCallback((newProductIp: PrismaProductIP, newPriceIncrease: string) => {
    setSelectProductIp(newProductIp)
    setPriceIncrease(newPriceIncrease)
  }, [])

  const updateProductIPConfig = useCallback(
    async (newProductIp: PrismaProductIP, newPriceIncrease: string) => {
      if (!configId || isUpdatingRef.current) return
      const updateKey = `${configId}-${newProductIp}-${newPriceIncrease}`
      if (lastUpdateRef.current === updateKey) return

      isUpdatingRef.current = true
      lastUpdateRef.current = updateKey
      try {
        const result = await updateProductIP({ configId, newProductIp })
        if (result.success && result.updatedConfig) {
          setConfiguration({
            ...result.updatedConfig,
            currency: result.updatedConfig.currency as SupportedCurrency,
            productIp: result.updatedConfig.productIp
              ? (result.updatedConfig.productIp as unknown as ProductIP)
              : undefined,
            colorTemp: result.updatedConfig.colorTemp ?? null,
            lampPriceIncrease:
              result.updatedConfig.lampPriceIncrease == null
                ? undefined
                : serializeMoney(result.updatedConfig.lampPriceIncrease),
            priceIncrease: serializeMoney(result.updatedConfig.priceIncrease),
          })
        } else {
          toast.error(tNotification("updateError"))
        }
      } catch {
        toast.error(tNotification("updateError"))
      } finally {
        isUpdatingRef.current = false
      }
    },
    [configId, tNotification],
  )

  useEffect(() => {
    if (!debouncedProductIp || !configId) return
    // Nothing to save on mount: the configuration already holds this value.
    // That write used to go out on every page view and race the customer's
    // first click — and, landing second, put IP20 back over the IP65 they
    // had just picked and been charged for on screen.
    if (appliedIpRef.current === debouncedProductIp) return
    updateProductIPConfig(debouncedProductIp, priceIncrease)
  }, [debouncedProductIp, priceIncrease, configId, updateProductIPConfig])

  // Adopt what the server stored — when the server stores something, and
  // only then. Listing the selection as a dependency too made this fire on
  // the click itself and put the old value back before it was saved.
  useEffect(() => {
    const fromConfig = configuration?.productIp as unknown as PrismaProductIP | undefined
    if (!fromConfig || appliedIpRef.current === fromConfig) return
    appliedIpRef.current = fromConfig
    setSelectProductIp(fromConfig)
  }, [configuration?.productIp])

  const { mutate: saveConfig, isPending: isSavingConfig } = useMutation({
    mutationKey: ["save-config", configId],
    mutationFn: (args: SaveConfigArgs) => _saveConfig(args),
    onError: () => {
      toast.error(tNotification("orderError"))
      setIsClicked(false)
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(tNotification("orderError"))
        setIsClicked(false)
        return
      }
      router.push(`/preview/${productId}`)
      toast.success(tNotification("configSaved"))
    },
  })

  const handleOrderNow = useCallback(() => {
    if (soldOut || isSavingConfig || isClicked || !configId || quantity < 1) return
    setIsClicked(true)
    saveConfig({ configId, productId, quantity })
  }, [soldOut, isSavingConfig, isClicked, configId, productId, quantity, saveConfig])

  const handleAddToBag = useCallback(() => {
    if (!isSignedIn) {
      toast.error(tNotification("signInRequired"))
      return
    }
    if (quantity >= BULK_ORDER_THRESHOLD) {
      setShowDialog(true)
      return
    }
    startTransition(async () => {
      try {
        // The quantity on screen, not one: the selector beside this button
        // used to count for "order now" only.
        await addToCart(productId, quantity)
        notifyCartChanged()
        toast.success(tNotification("addedToCart", { productName }))
      } catch {
        toast.error(tNotification("failedToAdd"))
      }
    })
  }, [isSignedIn, quantity, productId, tNotification, productName])

  const stockLine = soldOut
    ? { tone: "text-destructive", dot: "bg-destructive", text: tPdp("soldOut") }
    : stock !== null && stock <= LOW_STOCK
      ? {
          tone: "text-foreground",
          dot: "bg-primary",
          text: tPdp("fewLeft", { count: stock, formatted: formatNumber(stock, locale === "ar" ? "ar" : "en") }),
        }
      : { tone: "text-foreground", dot: "bg-emerald-500", text: tPdp("inStock") }

  const ipNote = showIP20Text
    ? t("availableOnlyIP20")
    : showMaxIpText
      ? t("availableOnlyIP20IP44IP54")
      : showOutdoorText
        ? t("availableOnlyIP65IP68")
        : null

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        {lightingTypeName && (
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-primary">
            {lightingTypeName}
          </p>
        )}
        <h1 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-semibold leading-[1.1] tracking-tight text-balance">
          {productName}
        </h1>
        {shortDescription && (
          <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">{shortDescription}</p>
        )}
        {/* A plain anchor, not the i18n Link: it is a same-page jump to
            the reviews section, not a route. */}
        {ratingCount > 0 && ratingAverage !== null && (
          <a
            href="#reviews"
            className="inline-flex items-center gap-2 text-[length:var(--text-sm)] transition-colors duration-[var(--dur-hover)] hover:text-primary"
          >
            <StarRating value={ratingAverage} />
            <span className="sr-only">{ratingLabel(ratingAverage, ratingCount, locale)}</span>
            <span aria-hidden className="tabular-nums text-muted-foreground underline-offset-4 hover:underline">
              {formatNumber(ratingCount, locale === "ar" ? "ar" : "en")}
            </span>
          </a>
        )}
      </header>

      <div className="space-y-2 rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {/* Keyed on the figure, so the one piece of motion on the page
              plays exactly when the price changes and at no other time. */}
          <span
            key={priceKey}
            className={cn(priceKey !== firstPriceKey && "price-tick", "font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold tabular-nums")}
          >
            {hasDiscount ? (
              <DiscountPrice
                price={price}
                discount={discount}
                quantity={quantity}
                priceIncrease={priceIncrease}
                lampPriceIncrease={lampPriceIncrease}
              />
            ) : (
              <NormalPrice price={totalPriceBeforeDiscount} quantity={quantity} />
            )}
          </span>
          {hasDiscount && (
            <>
              <s className="text-[length:var(--text-base)] tabular-nums text-muted-foreground">
                <NormalPrice price={totalPriceBeforeDiscount} quantity={quantity} />
              </s>
              <span className="rounded-md bg-primary px-2 py-0.5 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary-foreground">
                {formatPercent(discount, locale)} {t("off")}
              </span>
            </>
          )}
        </div>
        {money(savingTotal).greaterThan(0) && (
          <p className="text-[length:var(--text-sm)] font-medium tabular-nums text-primary">
            {t("save")} <NormalPrice price={savingTotal} />
          </p>
        )}
        <p className={cn("flex items-center gap-2 pt-1 text-[length:var(--text-sm)] font-medium", stockLine.tone)}>
          <span aria-hidden className={cn("size-2 rounded-full", stockLine.dot)} />
          {stockLine.text}
        </p>
      </div>

      <div className="space-y-5">
        {/* Arms decide, not the brand: the catalogue returns choices only
            for a fixture a bulb goes into. */}
        {bulbChoices.length > 0 && (
          <BulbOptions
            configId={configId}
            choices={bulbChoices}
            selectedBulbId={selectedBulbId}
            onBulbChange={handleBulbChange}
          />
        )}
        <ColorTempOptions
          configId={configId}
          productColorTemp={selectedColorTemp}
          onColorTempChange={setSelectedColorTemp}
        />
        {brand === "balcom" && (
          <IpOptions
            configId={configId ?? ""}
            baseIp={(baseIp ?? "IP20") as ProductIP}
            productIp={selectedProductIp}
            onProductIpChange={handleProductIPChange}
            basePrice={price}
            discount={discount}
            maxIP={maxIP ?? 20}
          />
        )}
        {ipNote && <p className="text-[length:var(--text-xs)] font-medium text-destructive">{ipNote}</p>}
      </div>

      {/* On a phone this rides along at the bottom of the screen; from md up
          it sits in the column. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <QuantitySelector
              quantity={quantity}
              onIncrease={() => setQuantity((value) => value + 1)}
              onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
              size="lg"
              rtlSupport
              minQuantity={1}
              disabled={soldOut}
            />
            <Button disabled={isPending || soldOut} onClick={handleAddToBag} className="h-12 flex-1 text-base">
              {isPending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
              {isPending ? t("adding") : tPdp("addToCart")}
            </Button>
          </div>
          <Button
            disabled={soldOut || isClicked || isSavingConfig}
            variant="outline"
            onClick={handleOrderNow}
            className="h-12 w-full bg-transparent text-base"
          >
            {isClicked || isSavingConfig ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("processingOrder")}
              </>
            ) : (
              t("orderNow")
            )}
          </Button>
        </div>
      </div>

      {/* The two promises the business already makes, where the decision is
          taken rather than three sections further down the page. */}
      <ul className="grid gap-3 border-t border-border pt-5 text-[length:var(--text-sm)] text-muted-foreground sm:grid-cols-2">
        <li className="flex items-center gap-2.5">
          <TruckIcon className="size-4 shrink-0 text-primary" aria-hidden />
          {t("delivery")}
        </li>
        <li className="flex items-center gap-2.5">
          <BanknoteIcon className="size-4 shrink-0 text-primary" aria-hidden />
          {t("cod")}
        </li>
      </ul>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tDialog("bulkOrderTitle")}</DialogTitle>
            <DialogDescription>{tDialog("bulkOrderDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{tDialog("close")}</Button>
            </DialogClose>
            <Button asChild>
              {/* Was tel:+1154466259 — the Egyptian country code missing,
                  so the call went to a North American number. */}
              <a href={`tel:${SHOWROOM_PHONE}`} onClick={() => setShowDialog(false)}>
                {tDialog("contactSalesTeam")}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
