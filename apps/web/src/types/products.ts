import type { BulbChoice } from "@repo/catalog/bulb-pricing"
import type { LocalizedSpecGroup } from "@/lib/specs-view"
import type { ProductFamily } from "@repo/catalog/families";
/**
 * Money and rates travel as strings in these view models.
 *
 * They are Decimal in the database: a JS number can't hold money exactly,
 * and a Prisma.Decimal can't be passed from a Server Component to a Client
 * Component. Server code serializes with @repo/money's serializeMoney at the
 * boundary, and components format for display.
 */
export type SupportedLanguage = "en" | "ar"
export type SupportedCurrency = "EGP" | "USD" | "EUR"

export enum ProductColorTemp {
  warm = "warm",
  cool = "cool",
  white = "white",
}

export enum ProductIP {
  IP20 = "IP20",
  IP44 = "IP44",
  IP54 = "IP54",
  IP65 = "IP65",
  IP68 = "IP68",
}

export enum ProductChandelierLamp {
  lamp9w = "lamp9w",
  lamp12w = "lamp12w",
}

export enum OrderStatus {
  awaiting_shipment = "awaiting_shipment",
  processing = "processing",
  shipped = "shipped",
  delivered = "delivered",
  fulfilled = "fulfilled",
  cancelled = "cancelled",
  refunded = "refunded",
}

export enum OrderOption {
  BasicShipping = "BasicShipping",
  StandardShipping = "StandardShipping",
  ExpressShipping = "ExpressShipping",
}

export interface ProductSpecification {
  id: string;
  productId: string;
  language: string;
  input?: string | null;
  maximumWattage?: number;
  brandOfLed?: string | null;
  luminousFlux?: string | null;
  mainMaterial?: string | null;
  cri?: string | null;
  beamAngle?: string | null;
  workingTemperature?: string | null;
  fixtureDimmable?: string | null;
  electrical?: string | null;
  powerFactor?: string | null;
  colorTemperature?: string | null;
  ip?: string | null;
  energySaving?: string | null;
  lifeTime?: string | null;
  finish?: string | null;
  lampBase?: string | null;
  bulb?: string | null;
  createdAt: Date;
  updatedAt: Date;
  customSpecs?: Record<string, any>
}

// Localized specifications for different languages
export interface LocalizedSpecs {
  input?: string;
  maximumWattage?: string;
  brandOfLed?: string;
  luminousFlux?: string;
  mainMaterial?: string;
  cri?: string;
  beamAngle?: string;
  workingTemperature?: string;
  fixtureDimmable?: string;
  electrical?: string;
  powerFactor?: string;
  colorTemperature?: string;
  ip?: string;
  energySaving?: string;
  lifeTime?: string;
  finish?: string;
  lampBase?: string;
  bulb?: string;
  customSpecs?: Record<string, any>;
}

export interface ProductTranslation {
  id: string
  productId: string
  language: SupportedLanguage
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface LocalizedCategory {
  id: string
  name: string
  slug: string
  localizedName: string
  localizedSlug: string
  sectionType: ProductFamily
  productCount: number
  image: string
}

export interface CategoryTranslation {
  id: string
  categoryId: string
  language: SupportedLanguage
  name: string
  description?: string
  metaTitle?: string
  metaDesc?: string
  slug?: string
}

export interface LightingTypeTranslation {
  id: string
  lightingTypeId: string
  language: SupportedLanguage
  name: string
  description?: string
  metaTitle?: string
  metaDesc?: string
  slug?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  translations?: CategoryTranslation[]
}

export interface LightingType {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  translations?: LightingTypeTranslation[]
}

export interface BaseProduct {
  id: string
  productId: string
  productName: string
  productImages: string[]
  maxIP?: number
  spotlightType: string
  price: string
  priceIncrease?: string
  sectionType: ProductFamily
  quantity: number
  brand: string
  discount: string
  chandelierLightingType?: string
  hNumber?: number
  isActive: boolean
  featured: boolean
  createdAt: Date
  updatedAt: Date
  categoryId: string
  lightingtypeId: string
  productColor: ProductColorTemp
  productIp: ProductIP
  productChandelierLamp: ProductChandelierLamp
  // Additional properties from your JSON data
  input?: string
  maximumWattage?: number
  brandOfLed?: string
  luminousFlux?: string
  mainMaterial?: string
  cri?: string
  beamAngle?: string
  workingTemperature?: string
  fixtureDimmable?: string
  electrical?: string
  powerFactor?: string
  colorTemperature?: string
  ip?: number
  energySaving?: string
  lifeTime?: string
  finish?: string
  lampBase?: string
}

export interface Product extends BaseProduct {
  category?: Category
  lightingType?: LightingType
  specifications?: ProductSpecification[]
  translations?: ProductTranslation[]
}
export type SectionType = "indoor" | "outdoor" | "chandelier";
export interface LocalizedProduct {
  id: string;
  productId: string;
  productName: string;
  localizedName?: string;
  localizedDescription?: string;
  brand: string;
  price: string;
  discount?: string;
  priceIncrease?: string;
  quantity: number;
  images: string[];
  productImages?: string[];
  sectionType: ProductFamily;
  spotlightType: string;
  categoryId?: string;
  lightingtypeId?: string;
  maxIP?: number;
  hNumber?: number;
  chandelierLightingType?: string;
  /** The structured specs, localized — what the description is built from. */
  specGroups?: LocalizedSpecGroup[];
  /** What the fixture is sold with, so the bulb clause states the real one. */
  bulbChoices?: BulbChoice[];
  /** The service sets this spelling — see transformToLocalizedProduct. */
  lightingtype?: LightingType;
  productColor?: string;
  productIp?: string;
  productChandLamp?: string;
  isActive?: boolean;
  featured?: boolean;
  specifications?: {
    language: string;
    maximumWattage?: string;
    mainMaterial?: string;
    beamAngle?: string;
    lampBase?: string;
    input?: string;
    brandOfLed?: string;
    luminousFlux?: string;
    cri?: string;
    workingTemperature?: string;
    fixtureDimmable?: string;
    electrical?: string;
    powerFactor?: string;
    colorTemperature?: string;
    ip?: string;
    energySaving?: string;
    lifeTime?: string;
    finish?: string;
    bulb?: string;
    customSpecs?: any;
  };
  specificationsArray?: any[];
  translations?: any[];
  maximumWattage?: string;
  mainMaterial?: string;
  beamAngle?: string;
  lampBase?: string;
  colorTemperature?: string;
  lifeTime?: string;
  finish?: string;
  input?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LocalizedProductWithRelations extends BaseProduct {
  category: Category
  lightingType: LightingType
  /** What the service actually sets; lightingType above is aspirational. */
  lightingtype?: LightingType
  specifications: ProductSpecification[]
  translations: ProductTranslation[]
  localizedSpecs?: LocalizedSpecs
  /**
   * The structured specs, grouped and rendered for this locale. Optional
   * because a product the spec backfill has not reached still falls back to
   * the flat table the page builds by hand.
   */
  specGroups?: LocalizedSpecGroup[]
  /**
   * The bulbs this fixture is sold with, priced for its arm count. Empty
   * for anything with no arms — there is nowhere to put one.
   */
  bulbChoices?: BulbChoice[]
}

export interface ProductCardProps {
  productId: string
  productName: string
  productImages: string[]
  price: string
  discount?: string
  brand: string
  Brand?: string
  quantity?: number
  maxIP?: number
  spotlightType: string
  sectionType: ProductFamily
  chandelierLightingType?: string
  hNumber?: number
  /** The structured specs, localized — what the description is built from. */
  specGroups?: LocalizedSpecGroup[]
  /** What the fixture is sold with, so the bulb clause states the real one. */
  bulbChoices?: BulbChoice[]
  lightingTypeName?: string
  specification?: ProductSpecification
  maximumWattage?: number
  mainMaterial?: string
  beamAngle?: string
  luminousFlux?: string
  colorTemperature?: string
  lifeTime?: string
  energySaving?: string
  cri?: string
  brandOfLed?: string
  electrical?: string
  finish?: string
  input?: string
  lampBase?: string
  ip?: number
}

export interface SpecificationsTable {
  [key: string]: string
}

export interface Configuration {
  id: string
  productId: string
  configPrice: string
  priceIncrease: string
  shippingPrice: string
  discount: string
  quantity: number
  lampPriceIncrease?: string
  /** Which bulb that amount was for — the amount alone could not say. */
  bulbId?: string | null
  totalPrice: string
  currency: SupportedCurrency
  productIp?: ProductIP
  createdAt: Date
  updatedAt: Date
}

export type ConfigurationData = Configuration

export interface Order {
  id: number
  userId: string
  productId: string
  productName: string
  productImages: string[]
  productColorTemp: string
  productIp: string
  productChandLamp: string
  quantity: number
  isCompleted: boolean
  status: OrderStatus
  currency: SupportedCurrency
  customerLanguage: SupportedLanguage
  createdAt: Date
  updatedAt: Date
  productPrice: string
  discountedPrice?: string | null
  discountApplied: boolean
  discountRate?: string | null
  totalPrice: string
  configPrice: string
  priceIncrease?: string
  shippingPrice: string
  brand?: string
  chandelierLightingType?: string
  orderTimeReceived?: Date | null
  configurationId?: string
  shippingAddressId?: string | null
}

export interface OrderItem {
  id: string
  orderId: number
  productId: string
  quantity: number
  configPrice: string
  configurationId?: string
  localizedName?: string
}

export interface User {
  id: string
  email?: string
  phoneNumber?: string
  preferredLanguage: SupportedLanguage
  preferredCurrency: SupportedCurrency
  createdAt: Date
  updatedAt: Date
  configurationId?: string
  productId?: string
  shippingAddressId?: string
}

export interface ShippingAddress {
  id: string
  userId: string
  fullName: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  countryCode: string
  phoneNumber: string
  isDefault: boolean
}

export interface Cart {
  id: string
  userId: string
  currency: SupportedCurrency
  createdAt: Date
  updatedAt: Date
  items?: CartItem[]
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  quantity: number
  createdAt: Date
  updatedAt: Date
  product?: LocalizedProduct
}

export interface SystemSetting {
  id: string
  key: string
  value: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CurrencyRate {
  id: string
  fromCurrency: SupportedCurrency
  toCurrency: SupportedCurrency
  rate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductListResponse {
  products: LocalizedProduct[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  totalPages: number
}

export interface CategoryListResponse {
  categories: Category[]
  total: number
}

export interface LightingTypeListResponse {
  lightingTypes: LightingType[]
  total: number
}

export interface LightingTypeSectionProps {
  products: LocalizedProduct[]
  subCategory: string
  lightingType: string
  locale: SupportedLanguage
  total: number
  hasMore: boolean
}

// Props Interfaces
export interface ProductsProps {
  product: LocalizedProductWithRelations
  configuration?: Configuration
  locale: string
}

export interface ProductsForChanProps {
  product: LocalizedProductWithRelations
  configuration?: Configuration
  locale: string
}

export interface LocalizedLabels {
  en: Record<string, string>
  ar: Record<string, string>
}

export interface LocalizationContext {
  locale: SupportedLanguage
  currency: SupportedCurrency
  isRTL: boolean
  labels: Record<string, string>
}

export interface ProductFilters {
  category?: string
  lightingType?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  ip?: ProductIP[]
  colorTemp?: ProductColorTemp[]
  inStock?: boolean
  featured?: boolean
}

export interface SearchParams {
  query?: string
  page?: number
  limit?: number
  sortBy?: "price" | "name" | "createdAt" | "featured"
  filters?: ProductFilters
  locale?: SupportedLanguage
}

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>
export type LocalizedField<T> = T & { localizedValue?: string }
export type WithTranslations<T> = T & { translations?: Record<SupportedLanguage, Partial<T>> }

