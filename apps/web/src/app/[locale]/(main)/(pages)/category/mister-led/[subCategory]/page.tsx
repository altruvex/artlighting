import { familyFromSlug, familySlug } from "@repo/catalog";
import { permanentRedirect } from "next/navigation";
import { PagePropsTypes } from "@/types";

/**
 * The old funnel, pointed at the shop.
 *
 * Brand, then section, then lighting type, then product: four pages to
 * reach a list that could not be sorted, filtered by price or read for
 * what was on sale, each one rendering its own copy of the product card
 * from a hand-assembled shape. The shop does all of it on one page with
 * the same facets, so these levels redirect into it and the product pages
 * below them keep their URLs.
 */

export default async function Page({ params }: PagePropsTypes) {
  const { locale, subCategory } = await params;
  const family = familyFromSlug(subCategory as string);
  if (!family) permanentRedirect(`/${locale}/products?brand=mister-led`);
  permanentRedirect(`/${locale}/products?brand=mister-led&family=${familySlug(family)}`);
}
