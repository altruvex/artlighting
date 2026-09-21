"use client"

import { searchProducts } from "@/actions/search"
import type { ProductFamily } from "@repo/catalog/families";
import { money, type MoneyInput } from "@repo/money";
import { Input } from "@/components/ui/input"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "use-debounce"
import DiscountPrice from "../discount-price"
import NormalPrice from "../normal-price"

interface Product {
    productId: string
    productName: string
    brand: string
    price: string
    productImages: string[]
    sectionType: ProductFamily
    spotlightType: string
    discount: string
    ProductId: string
    chandelierLightingType: string
    hNumber: number
    maximumWattage: string
    lampBase: string
    mainMaterial: string
    beamAngle: string
}

interface SearchHeaderProps {
    isMobile?: boolean
    isMobileSheet?: boolean
}

export function SearchHeader({ isMobile = false, isMobileSheet = false }: SearchHeaderProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const t = useTranslations("search")
    const locale = useLocale()
    const router = useRouter()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearchTerm.trim() === "") {
                setFilteredProducts([])
                setShowResults(false)
                return
            }

            setIsSearching(true)
            setShowResults(true)
            try {
                const results = await searchProducts(debouncedSearchTerm, locale)
                const formattedResults: Product[] = results.map((product: any) => ({
                    ...product,
                    ProductId: product.productId,
                    discount: product.discount || 0,
                }))

                setFilteredProducts(formattedResults)
            } catch (error) {
                console.error("Error searching products:", error)
                setFilteredProducts([])
            } finally {
                setIsSearching(false)
            }
        }

        performSearch()
    }, [debouncedSearchTerm])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        if (e.target.value.trim() !== "") {
            setShowResults(true)
        }
    }

    const handleInputFocus = () => {
        if (searchTerm.trim() !== "") {
            setShowResults(true)
        }
    }

    const handleResultClick = () => {
        setShowResults(false)
        setSearchTerm("")
    }

    // Enter goes to the shop, filtered by the same words — the dropdown
    // showed six matches and hid the rest behind a button that had been
    // commented out, pointing at /search, a page that does not exist.
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        const query = searchTerm.trim()
        if (!query) return
        setShowResults(false)
        router.push(`/products?q=${encodeURIComponent(query)}`)
    }

    if (isMobile && !isMobileSheet) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 bg-transparent hover:bg-accent/50 transition-colors"
                aria-label="Search products"
            >
                <Search className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <div className="relative" ref={searchRef}>
            <form role="search" onSubmit={handleSubmit} className={`relative ${isMobileSheet ? "w-full" : "w-64"}`}>
                {/* A real submit button, not a decorative icon: it is what
                    makes Enter submit the field, and it gives the search a
                    control a keyboard and a screen reader can reach. */}
                <button
                    type="submit"
                    aria-label={t("submit", { defaultMessage: "Search" })}
                    className="absolute inset-y-0 start-0 grid w-10 place-items-center text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground"
                >
                    <Search className="size-4" aria-hidden />
                </button>
                <Input
                    type="search"
                    placeholder={t("placeholder", { defaultMessage: "Search products..." })}
                    className="w-full bg-background ps-10 transition-colors focus:border-primary/50"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                />
            </form>
            {showResults && (
                <SearchResults
                    isSearching={isSearching}
                    searchTerm={searchTerm}
                    filteredProducts={filteredProducts}
                    onResultClick={handleResultClick}
                    t={t}
                />
            )}
        </div>
    )
}

interface SearchResultsProps {
    isSearching: boolean
    searchTerm: string
    filteredProducts: Product[]
    onResultClick: () => void
    t: any
}

function SearchResults({ isSearching, searchTerm, filteredProducts, onResultClick, t }: SearchResultsProps) {
    return (
        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border/50 rounded-lg shadow-xl mt-2">
            <div className="max-h-96 overflow-hidden">
                {isSearching && <SearchLoader t={t} />}

                {!isSearching && searchTerm && filteredProducts.length === 0 && (
                    <NoResults searchTerm={searchTerm} t={t} />
                )}

                {filteredProducts.length > 0 && (
                    <ProductResults
                        products={filteredProducts}
                        onResultClick={onResultClick}
                        searchTerm={searchTerm}
                        t={t}
                    />
                )}
            </div>
        </div>
    )
}

function SearchLoader({ t }: { t: any }) {
    return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{t("searching", { defaultMessage: "Searching..." })}</span>
        </div>
    )
}

function NoResults({ searchTerm, t }: { searchTerm: string; t: any }) {
    return (
        <div className="p-8 text-center text-muted-foreground">
            {t("noResults", { defaultMessage: "No products found for", searchTerm })} "{searchTerm}"
        </div>
    )
}

function ProductResults({ products, onResultClick, searchTerm, t }: {
    products: Product[]
    onResultClick: () => void
    searchTerm: string
    t: any
}) {
    return (
        <ScrollArea className="h-96 overflow-y-auto">
            <div className="p-4">
                <div className="space-y-4">
                    {products.slice(0, 6).map((product) => (
                        <ProductItem
                            key={product.productId}
                            product={product}
                            onResultClick={onResultClick}
                        />
                    ))}
                </div>

                {products.length > 6 && (
                    <ViewAllResults
                        totalResults={products.length}
                        searchTerm={searchTerm}
                        onResultClick={onResultClick}
                        t={t}
                    />
                )}
            </div>
        </ScrollArea>
    )
}

function ProductItem({ product, onResultClick }: {
    product: Product
    onResultClick: () => void
}) {
    return (
        <Link
            href={`/category/${product.brand}/${product.sectionType}/${product.spotlightType}/${product.productId}`}
            onClick={onResultClick}
            className="block hover:bg-accent/50 rounded-lg p-3 transition-colors"
        >
            <div className="flex items-start gap-4 rtl:flex-row-reverse">
                {product.productImages?.[0] && (
                    <Image
                        src={product.productImages[0]}
                        alt={product.productName}
                        className="object-cover rounded w-16 h-16 shrink-0"
                        width={64}
                        height={64}
                    />
                )}

                <div className="flex-1 space-y-1 min-w-0 rtl:text-right">
                    <p className="font-medium uppercase text-sm line-clamp-2">
                        {product.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {product.brand} • {product.spotlightType}
                    </p>

                    <ProductPrice product={product} />
                </div>
            </div>
        </Link>
    )
}

function ProductPrice({ product }: { product: Product }) {
    if (money(product.discount).greaterThan(0)) {
        return (
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <span className="text-sm text-destructive font-semibold">
                    <DiscountPrice
                        price={product.price}
                        discount={product.discount}
                        sectionType={product.sectionType}
                    />
                </span>
                <s className="text-gray-500 italic text-xs">
                    <NormalPrice price={product.price} sectionType={product.sectionType} />
                </s>
            </div>
        )
    }

    return (
        <span className="font-semibold text-sm">
            <NormalPrice price={product.price} sectionType={product.sectionType} />
        </span>
    )
}

function ViewAllResults({ totalResults, searchTerm, onResultClick, t }: {
    totalResults: number
    searchTerm: string
    onResultClick: () => void
    t: any
}) {
    return (
        <div className="text-center mt-4 text-sm text-muted-foreground border-t pt-4">
            {t("showingResults", {
                defaultMessage: "Showing 6 of {total} results",
                total: totalResults
            })}
            <Link
                href={`/products?q=${encodeURIComponent(searchTerm)}`}
                onClick={onResultClick}
                className="mt-2 block"
            >
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                    {t("viewAll", { defaultMessage: "View All Results" })}
                </Button>
            </Link>
        </div>
    )
}