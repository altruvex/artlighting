import { ProductPage, productPageMetadata, productStaticParams } from "@/components/product/product-page"
import type { PagePropsTypes } from "@/types"
import type { Metadata } from "next"
import { Suspense } from "react"
import Loading from "@/app/[locale]/loading"


// The params are read inside the boundary, so a link to any product can
// prefetch the route's shared shell (partialPrefetching).
export default function Page({ params }: PagePropsTypes) {
  return (
    <Suspense fallback={<Loading />}>
      <ProductPage params={params} brand="mister-led" />
    </Suspense>
  )
}

export function generateMetadata({ params }: PagePropsTypes): Promise<Metadata> {
  return productPageMetadata({ params, brand: "mister-led" })
}

export function generateStaticParams() {
  return productStaticParams("mister-led")
}
