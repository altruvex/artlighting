"use client"

import { searchProducts, type SearchHit } from "@/actions/search"
import { MIN_SEARCH_LENGTH } from "@/actions/search-limits"
import { familySlug } from "@repo/catalog/families"
import type { ProductFamily } from "@repo/catalog/families";
import { money } from "@repo/money";
import { Input } from "@repo/ui/components/input"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@repo/ui/components/button"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import { Loader2, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "use-debounce"
import DiscountPrice from "@/components/price/discount-price"
import NormalPrice from "@/components/price/normal-price"

type Product = SearchHit
type SearchResult = { hits: Product[]; total: number }

const EMPTY: SearchResult = { hits: [], total: 0 }

/** Long enough to be worth asking the server about. */
const searchable = (term: string) => term.trim().length >= MIN_SEARCH_LENGTH

interface SearchHeaderProps {
    isMobile?: boolean
    isMobileSheet?: boolean
}

export function SearchHeader({ isMobile = false, isMobileSheet = false }: SearchHeaderProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
    const [result, setResult] = useState<SearchResult>(EMPTY)
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const t = useTranslations("search")
    const locale = useLocale()
    const router = useRouter()
    // Terms already answered this session: backspacing over a word, or
    // typing it again, does not ask the server twice.
    const cacheRef = useRef(new Map<string, SearchResult>())
    // Only the latest request may write its answer: a slow reply for "ch"
    // must not replace the one for "chandelier" that came back first.
    const latestRef = useRef(0)

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
        const request = ++latestRef.current
        const term = debouncedSearchTerm.trim()
        if (!searchable(term)) {
            setResult(EMPTY)
            setIsSearching(false)
            setShowResults(false)
            return
        }

        const key = `${locale}:${term.toLocaleLowerCase(locale)}`
        const cached = cacheRef.current.get(key)
        setShowResults(true)
        if (cached) {
            setResult(cached)
            setIsSearching(false)
            return
        }

        setIsSearching(true)
        searchProducts(term, locale)
            .then((next) => {
                cacheRef.current.set(key, next)
                if (request === latestRef.current) setResult(next)
            })
            .catch((error) => {
                console.error("Error searching products:", error)
                if (request === latestRef.current) setResult(EMPTY)
            })
            .finally(() => {
                if (request === latestRef.current) setIsSearching(false)
            })
    }, [debouncedSearchTerm, locale])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        if (searchable(e.target.value)) {
            setShowResults(true)
        }
    }

    const handleInputFocus = () => {
        if (searchable(searchTerm)) {
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
                aria-label={t("submit")}
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
                    filteredProducts={result.hits}
                    total={result.total}
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
    total: number
    onResultClick: () => void
    t: any
}

function SearchResults({ isSearching, searchTerm, filteredProducts, total, onResultClick, t }: SearchResultsProps) {
    return (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-md border border-border bg-popover text-popover-foreground shadow-e3">
            <div className="max-h-96 overflow-hidden">
                {isSearching && <SearchLoader t={t} />}

                {!isSearching && searchTerm && filteredProducts.length === 0 && (
                    <NoResults searchTerm={searchTerm} t={t} />
                )}

                {filteredProducts.length > 0 && (
                    <ProductResults
                        products={filteredProducts}
                        total={total}
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
            <Loader2 className="me-2 size-5 animate-spin text-muted-foreground" aria-hidden />
            <span className="text-[length:var(--text-sm)] text-muted-foreground">{t("searching", { defaultMessage: "Searching..." })}</span>
        </div>
    )
}

function NoResults({ searchTerm, t }: { searchTerm: string; t: any }) {
    return (
        <div className="p-8 text-center text-[length:var(--text-sm)] text-muted-foreground">
            {t("noResults", { defaultMessage: "No products found for", searchTerm })} "{searchTerm}"
        </div>
    )
}

function ProductResults({ products, total, onResultClick, searchTerm, t }: {
    products: Product[]
    total: number
    onResultClick: () => void
    searchTerm: string
    t: any
}) {
    return (
        <ScrollArea className="h-96 overflow-y-auto">
            <div className="p-2">
                <div className="space-y-1">
                    {products.map((product) => (
                        <ProductItem
                            key={product.productId}
                            product={product}
                            onResultClick={onResultClick}
                        />
                    ))}
                </div>

                {total > products.length && (
                    <ViewAllResults
                        shown={products.length}
                        totalResults={total}
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
            href={`/category/${product.brand}/${familySlug(product.sectionType as ProductFamily)}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`}
            onClick={onResultClick}
            className="block rounded-md p-3 transition-colors duration-[var(--dur-hover)] hover:bg-accent/60 focus-visible:bg-accent/60"
        >
            <div className="flex items-start gap-4">
                {product.image && (
                    <Image
                        src={product.image}
                        alt={product.productName}
                        className="product-photo size-16 shrink-0 rounded-sm bg-muted object-cover"
                        width={64}
                        height={64}
                    />
                )}

                <div className="min-w-0 flex-1 space-y-1">
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
            <div className="flex items-center gap-2 tabular-nums">
                <span className="text-sm text-destructive font-semibold">
                    <DiscountPrice
                        price={product.price}
                        discount={product.discount}
                        sectionType={product.sectionType}
                    />
                </span>
                <s className="text-muted-foreground text-xs">
                    <NormalPrice price={product.price} sectionType={product.sectionType} />
                </s>
            </div>
        )
    }

    return (
        <span className="text-sm font-semibold tabular-nums">
            <NormalPrice price={product.price} sectionType={product.sectionType} />
        </span>
    )
}

function ViewAllResults({ shown, totalResults, searchTerm, onResultClick, t }: {
    shown: number
    totalResults: number
    searchTerm: string
    onResultClick: () => void
    t: any
}) {
    return (
        <div className="mt-2 border-t border-border px-2 pt-3 pb-1 text-center text-sm text-muted-foreground">
            {t("showingResults", {
                defaultMessage: "Showing {shown} of {total} results",
                shown,
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