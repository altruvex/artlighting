import { APPLICATIONS } from "@/content/applications";
import { GUIDE } from "@/content/guide";
import { LIGHTING_TYPES } from "@/content/lighting-types";
import { POLICIES } from "@/lib/company";
import { projectsFor } from "@/lib/projects";
import { absoluteUrl, LOCALES } from "@/lib/site";
import { prisma } from "@repo/database";
import { familySlug, productFamilies } from "@repo/catalog/families";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Every public page, in both languages, each entry carrying its other
 * language as an alternate. Products come from the database, so a product
 * retired in the admin leaves the sitemap within the hour.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Next writes the URL into the XML as given, so the "&" between query
  // parameters has to arrive escaped or the whole file fails to parse.
  const url = (locale: string, path: string) => absoluteUrl(locale, path).replace(/&/g, "&amp;");
  const entry = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap =>
    LOCALES.map((locale) => ({
      url: url(locale, path),
      lastModified,
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((other) => [other, url(other, path)])) },
    }));

  const pages: [string, number][] = [
    ["/", 1],
    ["/products", 0.9],
    // The shop's family and lighting-type views are the category pages:
    // each has its own title and canonical (see products/page.tsx).
    ...productFamilies.map((family): [string, number] => [`/products?family=${familySlug(family)}`, 0.8]),
    ...LIGHTING_TYPES.map((type): [string, number] => [`/products?family=${familySlug(type.family)}&type=${type.id}`, 0.8]),
    ["/applications", 0.8],
    ["/services", 0.8],
    ["/about-us", 0.8],
    ["/all-projects", 0.7],
    ["/lighting-guide", 0.7],
    ["/contact-us", 0.7],
    ["/faqs", 0.5],
    ...POLICIES.map((policy): [string, number] => [policy.href, 0.3]),
    ...APPLICATIONS.map((application): [string, number] => [`/applications/${application.slug}`, 0.7]),
    ...GUIDE.map((article): [string, number] => [`/lighting-guide/${article.slug}`, 0.6]),
    ...projectsFor("en").map((project): [string, number] => [`/all-projects/${project.ProjectId}`, 0.5]),
  ];

  const products = await sitemapProducts();

  return [
    ...pages.flatMap(([path, priority]) => entry(path, priority)),
    ...products.flatMap((product) =>
      entry(
        `/category/${product.brand}/${familySlug(product.sectionType)}/${product.spotlightType.toLowerCase()}/${product.productId.toLowerCase()}`,
        0.8,
        product.updatedAt,
      ),
    ),
  ];
}

/**
 * The product rows the sitemap lists, cached for an hour — the window the
 * route-level `revalidate` used to give — and dropped early when the
 * catalogue changes.
 */
async function sitemapProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  try {
    return await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { brand: true, sectionType: true, spotlightType: true, productId: true, updatedAt: true },
    });
  } catch {
    // A sitemap without products is better than no sitemap.
    return [];
  }
}
