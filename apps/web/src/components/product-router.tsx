"use client"

import BalcomProducts from "@/app/[locale]/(main)/(pages)/category/balcom/[subCategory]/[lightingType]/[ProductId]/products"
import ChandelierProducts from "@/app/[locale]/(main)/(pages)/category/mister-led/[subCategory]/[lightingType]/[ProductId]/products"
import type { LocalizedProductData } from "@/lib/services/product.service"
import type { Configuration } from "@/types/products"

interface ProductRouterProps {
    product: LocalizedProductData
    relatedProducts?: LocalizedProductData[]
    configuration?: Configuration
    locale: string
}

export default function ProductRouter({
    product,
    relatedProducts = [],
    configuration,
    locale,
}: ProductRouterProps) {
    if (product.brand === "balcom") {
        return (
            <BalcomProducts
                product={product as any}
                relatedProducts={relatedProducts.filter((p) => p.brand === "balcom") as any}
                configuration={configuration}
                locale={locale}
            />
        )
    }

    if (product.brand === "mister-led" && product.sectionType === "CHANDELIER") {
        return (
            <ChandelierProducts
                product={product as any}
                relatedProducts={
                    relatedProducts.filter(
                        (p) => p.brand === "mister-led" && p.sectionType === "CHANDELIER"
                    ) as any
                }
                configuration={configuration}
                locale={locale}
            />
        )
    }

    return (
        <BalcomProducts
            product={product as any}
            relatedProducts={relatedProducts as any}
            configuration={configuration}
            locale={locale}
        />
    )
}