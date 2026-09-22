import { ProductPage, productPageMetadata } from "@/components/product/product-page"
import type { PagePropsTypes } from "@/types"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export default function Page({ params }: PagePropsTypes) {
  return <ProductPage params={params} brand="balcom" />
}

export function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  return productPageMetadata({ params, brand: "balcom" })
}
