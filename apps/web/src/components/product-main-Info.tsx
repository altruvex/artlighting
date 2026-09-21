"use client"

import { addToCart } from "@/actions/cart"
import { notifyCartChanged } from "@/lib/cart-events"
import type { ProductFamily } from "@repo/catalog/families";
import { addMoney, applyRate, clampNonNegative, money, type MoneyInput, multiplyMoney, serializeMoney, subtractMoney } from "@repo/money"
import { updateProductIP } from "@/actions/product-ip"
import { saveConfig as _saveConfig, type SaveConfigArgs } from "@/components/action"
import AddToCardIcon from "@/components/add-to-card"
import DiscountPrice from "@/components/discount-price"
import NormalPrice from "@/components/normal-price"
import ProductBulbButtons from "@/components/product-bulb-buttons"
import type { BulbChoice } from "@repo/catalog/bulb-pricing"
import { useProductDescription } from "@/lib/use-product-description"
import type { LocalizedSpecGroup } from "@/lib/specs-view"
import ProductColorTempButtons from "@/components/product-color-temp-buttons"
import ProductIPButtons from "@/components/product-ip-buttons"
import { QuantitySelector } from "@/components/quantity-selector"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { formatPercent } from "@/lib/numbers"
import { ProductIP, type Configuration, type Order, type SupportedCurrency } from "@/types/products"
import { useAuth } from "@/lib/auth-hooks"
import type { ProductIP as PrismaProductIP, ProductChandLamp, ProductColorTemp } from "@repo/database"
import { useMutation } from "@tanstack/react-query"
import { ArrowRight, BanknoteIcon, TruckIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useDebounce } from "use-debounce"

const PRODUCTS_WITH_IP20_TEXT = ["product-jy-810-10w", "product-jy-810-12w", "product-jy-810-18w", "product-jy-810-30w"]
const PRODUCTS_WITH_MAX_IP_TEXT = ["product-jy-913-5w", "product-jy-913-8w", "product-jy-913-12w", "product-jy-913-18w"]
const DEBOUNCE_DELAY = 300
const BULK_ORDER_THRESHOLD = 10
const QUANTITY_STORAGE_KEY_PREFIX = "quantity-"

interface ProductMainInfoProps {
  productName: string
  /** Serialized money (see @repo/money): never a float. */
  price: string
  quantity?: number
  increaseQuantity?: () => void
  decreaseQuantity?: () => void
  productId: string
  configId?: string
  /** Rate, not percent: 0.13 = 13%. */
  discount: string
  order?: Order
  chandelierLightingType?: string
  Brand: string
  hNumber?: number
  /** Priced for this fixture's arms; empty when it has none. */
  bulbChoices?: BulbChoice[]
  /** The structured specs, localized — what the description is built from. */
  specGroups?: LocalizedSpecGroup[]
  /** The lighting type's name in this locale, for the opening clause. */
  lightingTypeName?: string
  configuration?: Configuration
  ip?: PrismaProductIP
  /** The fixture's own rating — the floor the customer upgrades from. */
  baseIp?: PrismaProductIP
  maxIP?: number
  sectionTypes?: ProductFamily[]
  sectionType: ProductFamily
  maximumWattage?: string
  mainMaterial?: string
  beamAngle?: string
  spotlightType: string
  luminousFlux?: string
  colorTemperature?: string
  lifeTime?: string
  energySaving?: string
  brandOfLed?: string
  cri?: string
  electrical?: string
  finish?: string
  input?: string
  lampBase?: string
}

export default function ProductMainInfo({
  productName,
  price,
  quantity = 1,
  increaseQuantity,
  decreaseQuantity,
  productId,
  configId,
  discount,
  order,
  chandelierLightingType,
  Brand,
  hNumber,
  bulbChoices = [],
  specGroups,
  lightingTypeName,
  configuration: initialConfiguration,
  ip,
  baseIp,
  maxIP,
  sectionTypes,
  sectionType,
  maximumWattage,
  mainMaterial,
  beamAngle,
  spotlightType,
  luminousFlux,
  colorTemperature,
  lifeTime,
  energySaving,
  brandOfLed,
  cri,
  electrical,
  finish,
  input,
  lampBase,
}: ProductMainInfoProps) {
  const t = useTranslations("product-main-info")
  const tNotification = useTranslations("product-notifications")
  const tDialog = useTranslations("product-dialog")
  const router = useRouter()
  const locale = useLocale()

  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)
  const [currentQuantity, setCurrentQuantity] = useState(quantity)
  const [isClicked, setIsClicked] = useState(false)
  const [configuration, setConfiguration] = useState<Configuration | undefined>(initialConfiguration)

  const [selectedColorTemp, setSelectedColorTemp] = useState<ProductColorTemp>(
    (order?.productColorTemp as ProductColorTemp) ?? "warm"
  )

  const [selectedProductIp, setSelectProductIp] = useState<PrismaProductIP>(
    (initialConfiguration?.productIp as unknown as PrismaProductIP) ??
    (order?.productIp as PrismaProductIP) ??
    ip ??
    "IP20"
  )

  // Which bulb, not which of two hard-coded wattages. The fixture is sold
  // with one, so the default stands until the customer picks another.
  const [selectedBulbId, setSelectedBulbId] = useState<string | undefined>(
    configuration?.bulbId ?? bulbChoices.find((choice) => choice.isDefault)?.id
  )

  // Money as serialized strings; see @repo/money.
  // From the saved configuration, not zero. The IP is restored on load, so
  // starting the amount at zero showed IP65 picked at the IP20 price.
  const [priceIncrease, setPriceIncrease] = useState<string>(
    initialConfiguration?.priceIncrease ?? "0"
  )
  // From the saved configuration, not zero: the selected bulb is restored on
  // load from configuration.bulbId, so starting the amount at zero showed
  // 15 W picked at the 9 W price until the customer touched something.
  const [lampPriceIncrease, setLampPriceIncrease] = useState<string>(
    configuration?.lampPriceIncrease ?? "0"
  )

  const { isSignedIn } = useAuth()
  // What the server currently holds for the IP, so neither effect below
  // writes a value it already has.
  const appliedIpRef = useRef<string | undefined>(initialConfiguration?.productIp as string | undefined)
  const isUpdatingRef = useRef(false)
  const lastUpdateRef = useRef<string>("")

  const [debouncedProductIp] = useDebounce(selectedProductIp, DEBOUNCE_DELAY)

  const totalPriceBeforeDiscount = useMemo(
    () => serializeMoney(addMoney(price, priceIncrease, lampPriceIncrease)),
    [price, priceIncrease, lampPriceIncrease]
  )

  // `discount` is a rate (0.13 = 13%). The old code guessed with
  // `discount > 1 ? discount / 100 : discount` and then Math.ceil'd, which
  // turned a 1.5% rate into 150% and drifted from the server's total.
  const discountedUnitPrice = useMemo(
    () => serializeMoney(clampNonNegative(subtractMoney(totalPriceBeforeDiscount, applyRate(totalPriceBeforeDiscount, discount)))),
    [totalPriceBeforeDiscount, discount]
  )

  /** What the discount takes off this configuration, at this quantity. */
  const savingTotal = useMemo(
    () => serializeMoney(multiplyMoney(subtractMoney(totalPriceBeforeDiscount, discountedUnitPrice), currentQuantity)),
    [totalPriceBeforeDiscount, discountedUnitPrice, currentQuantity]
  )

  const finalTotalPrice = useMemo(
    () => serializeMoney(multiplyMoney(discountedUnitPrice, currentQuantity)),
    [discountedUnitPrice, currentQuantity]
  )

  const effectiveMaxIP = useMemo(() => maxIP ?? 20, [maxIP])

  const showIP20Text = useMemo(() => PRODUCTS_WITH_IP20_TEXT.includes(productId), [productId])
  const showMaxIpText = useMemo(() => PRODUCTS_WITH_MAX_IP_TEXT.includes(productId), [productId])
  const showOutdoorText = useMemo(() => sectionTypes?.includes("OUTDOOR") ?? false, [sectionTypes])

  useEffect(() => {
    try {
      localStorage.setItem(`${QUANTITY_STORAGE_KEY_PREFIX}${productId}`, currentQuantity.toString())
    } catch {
      // localStorage can be unavailable (private mode, quota); persisting quantity is best-effort.
    }
  }, [currentQuantity, productId])

  const handleIncreaseQuantity = useCallback(() => {
    setCurrentQuantity((prev) => prev + 1)
    increaseQuantity?.()
  }, [increaseQuantity])

  const handleDecreaseQuantity = useCallback(() => {
    if (currentQuantity > 1) {
      setCurrentQuantity((prev) => prev - 1)
      decreaseQuantity?.()
    }
  }, [currentQuantity, decreaseQuantity])

  const handleBulbChange = useCallback((bulbId: string, newLampPriceIncrease: string) => {
    setSelectedBulbId(bulbId)
    setLampPriceIncrease(newLampPriceIncrease)
  }, [])

  const handleColorTempChange = useCallback((newColorTemp: ProductColorTemp) => {
    setSelectedColorTemp(newColorTemp)
  }, [])

  const handleProductIPChange = useCallback(
    (newProductIp: PrismaProductIP, newPriceIncrease: string) => {
      setSelectProductIp(newProductIp)
      setPriceIncrease(newPriceIncrease)
    },
    []
  )

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
    [configId, tNotification]
  )

  useEffect(() => {
    if (!debouncedProductIp || !configId) return
    // Nothing to save on mount: the configuration already holds this value.
    // That write used to go out on every page view and race the customer's
    // first click — and being the slower of the two, it landed second and
    // put IP20 back over the IP65 they had just picked and been charged for
    // on screen.
    if (appliedIpRef.current === debouncedProductIp) return
    updateProductIPConfig(debouncedProductIp, priceIncrease)
  }, [debouncedProductIp, priceIncrease, configId, updateProductIPConfig])

  // Adopt what the server stored — when the server stores something, and
  // only then.
  //
  // This used to list selectedProductIp as a dependency too, which made it
  // fire on the click itself: it compared the customer's new choice against
  // the configuration it had not been saved to yet, decided they disagreed,
  // and put the old value back. The debounce then wrote *that*. Picking
  // IP65 raised the price on screen, showed a success toast, and saved
  // IP20 with no increase.
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
    onSuccess: () => {
      try {
        localStorage.removeItem("cached-config")
        router.push(`/preview/${productId}`)
        toast.success(tNotification("configSaved"))
      } catch {
        toast.error("Navigation failed. Please try again.")
        setIsClicked(false)
      }
    },
  })

  const handleOrderNow = useCallback(() => {
    if (isSavingConfig || isClicked || !configId || !productId || currentQuantity < 1) return
    setIsClicked(true)
    saveConfig({ configId, productId, quantity: currentQuantity })
  }, [isSavingConfig, isClicked, configId, productId, currentQuantity, saveConfig])

  const handleAddToBag = useCallback(() => {
    if (!isSignedIn) {
      toast.error(tNotification("signInRequired"))
      return
    }
    startTransition(async () => {
      if (currentQuantity >= BULK_ORDER_THRESHOLD) {
        setShowDialog(true)
        return
      }
      try {
        await addToCart(productId)
        notifyCartChanged()
        toast.success(tNotification("addedToCart", { productName }))
      } catch {
        toast.error(tNotification("failedToAdd"))
      }
    })
  }, [isSignedIn, currentQuantity, productId, tNotification, productName])

  // One generated description, built from what the catalogue records about
  // this product — see @repo/catalog/describe. The three hand-branched
  // builders it replaces disagreed with each other, read the legacy spec
  // columns, and stated a 12 W bulb that is a row now.
  const describable = useMemo(
    () => ({
      family: sectionType,
      lightingTypeName,
      hNumber,
      bulbChoices,
      specGroups,
    }),
    [sectionType, lightingTypeName, hNumber, bulbChoices, specGroups]
  )
  const shortDescription = useProductDescription(describable, "short")
  const fullDescription = useProductDescription(describable, "full")

  return (
    <div>
      <div className="space-y-3">
        {lightingTypeName && (
          <p className="text-[length:var(--text-sm)] font-medium tracking-wide text-muted-foreground">
            {lightingTypeName}
          </p>
        )}
        <h1 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-semibold tracking-tight">
          {productName}
        </h1>
        <p className="text-[length:var(--text-base)] leading-relaxed text-muted-foreground">
          {shortDescription}
        </p>
      </div>

      {/* The price sits above the options, and moves as they are chosen:
          the upgrade a shopper is weighing is priced in the same figure
          they will be charged. */}
      <div className="mt-6 space-y-1 border-y border-border py-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-[family-name:var(--font-display-face)] text-[length:var(--text-2xl)] font-semibold tabular-nums">
            {money(discount).greaterThan(0) ? (
              <DiscountPrice
                price={price}
                discount={discount}
                quantity={currentQuantity}
                priceIncrease={priceIncrease}
                lampPriceIncrease={lampPriceIncrease}
              />
            ) : (
              <NormalPrice price={totalPriceBeforeDiscount} quantity={currentQuantity} />
            )}
          </span>
          {money(discount).greaterThan(0) && (
            <>
              <s className="text-[length:var(--text-base)] tabular-nums text-muted-foreground">
                <NormalPrice price={totalPriceBeforeDiscount} quantity={currentQuantity} />
              </s>
              <span className="rounded-md bg-primary px-2 py-0.5 text-[length:var(--text-xs)] font-semibold tabular-nums text-primary-foreground">
                {formatPercent(discount, locale)} {t("off")}
              </span>
            </>
          )}
        </div>
        {money(savingTotal).greaterThan(0) && (
          <p className="flex items-center gap-1 text-[length:var(--text-sm)] font-medium tabular-nums text-primary">
            {t("save")} <NormalPrice price={savingTotal} />
          </p>
        )}
      </div>

      <div className="space-y-6 mt-6">
        <div className={cn(
          "grid gap-6",
          bulbChoices.length > 0 && "sm:grid-cols-2",
          Brand === "balcom" && "sm:grid-cols-2",
        )}>
          <div className="space-y-4">
            {/* Arms decide, not the brand: the catalogue returns choices
                only for a fixture a bulb goes into. */}
            {bulbChoices.length > 0 && (
              <ProductBulbButtons
                configId={configId}
                choices={bulbChoices}
                selectedBulbId={selectedBulbId}
                onBulbChange={handleBulbChange}
              />
            )}
            {Brand === "balcom" && (
              <ProductIPButtons
                configId={configId ?? ""}
                baseIp={(baseIp ?? "IP20") as ProductIP}
                productIp={selectedProductIp}
                onProductIpChange={handleProductIPChange}
                basePrice={price}
                discount={discount}
                maxIP={effectiveMaxIP}
              />
            )}
          </div>
          <div className="space-y-4">
            <ProductColorTempButtons
              productId={productId}
              productColorTemp={selectedColorTemp}
              onColorTempChange={handleColorTempChange}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-primary">
            <span className="text-[length:var(--text-sm)] font-medium">{t("checkAvailability")}</span>
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </div>
          <div className="text-end">
            <span className="inline-flex items-center gap-2 text-[length:var(--text-sm)] font-medium">
              <span aria-hidden className="size-2 rounded-full bg-primary" />
              {t("inStock")}
            </span>
            {showIP20Text && <div className="text-destructive text-[13px] font-medium">{t("availableOnlyIP20")}</div>}
            {showMaxIpText && <div className="text-destructive text-[13px] font-medium">{t("availableOnlyIP20IP44IP54")}</div>}
            {showOutdoorText && <div className="text-destructive text-[13px] font-medium">{t("availableOnlyIP65IP68")}</div>}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 backdrop-blur md:relative md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 mx-auto md:max-w-none md:p-0 py-4">
          <div className="flex items-center gap-4">
            <QuantitySelector
              quantity={currentQuantity}
              onIncrease={handleIncreaseQuantity}
              onDecrease={handleDecreaseQuantity}
              size="lg"
              rtlSupport={true}
              minQuantity={1}
            />
            <Button disabled={isPending} onClick={handleAddToBag} className="flex-1 h-12 text-base">
              {isPending ? t("adding") : t("addToCart")}
              <AddToCardIcon Fill="currentColor" width={20} height={20} className="ml-2" />
            </Button>
          </div>
          <Button
            disabled={isClicked || isSavingConfig}
            variant="outline"
            onClick={handleOrderNow}
            className="w-full h-12 bg-transparent text-base"
          >
            {isClicked || isSavingConfig ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                {t("processingOrder")}
              </div>
            ) : (
              t("orderNow")
            )}
          </Button>
        </div>
      </div>

      {/* The two promises the business already makes, where the decision
          is taken rather than three sections further down the page. */}
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-sm)] text-muted-foreground">
        <li className="flex items-center gap-2">
          <TruckIcon className="size-4 text-primary" aria-hidden />
          {t("delivery")}
        </li>
        <li className="flex items-center gap-2">
          <BanknoteIcon className="size-4 text-primary" aria-hidden />
          {t("cod")}
        </li>
      </ul>

      <div className="mt-8 mb-20 md:mb-0">
        <h2 className="text-[length:var(--text-xl)] font-semibold mb-3">{t("description")}</h2>
        <p className="text-[length:var(--text-base)] leading-relaxed text-muted-foreground">{fullDescription}</p>
      </div>

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
            <a
              href="tel:+1154466259"
              onClick={() => setShowDialog(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md inline-flex items-center"
            >
              {tDialog("contactSalesTeam")}
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}