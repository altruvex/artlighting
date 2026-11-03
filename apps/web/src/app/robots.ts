import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

const PRIVATE = ["/api/", "/*/preview/", "/*/confirm", "/*/complete", "/*/thank-you", "/*/sign-in", "/*/sign-up"];

/** Crawl the storefront; keep crawlers out of checkout, account and API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE,
          // Shop sort/price/search/sale combinations: each is an uncached
          // render for the same products (canonicals already fold them).
          // family, type, brand and page stay crawlable.
          "/*?*sort=", "/*?*min=", "/*?*max=", "/*?*q=", "/*?*sale="],
      },
      {
        // GPTBot walked every family/type/brand/page combination of the shop
        // (~65k uncached renders a day, Nov 2026). It keeps every page without
        // a query string (products, categories, the shop itself) but no
        // filtered URL. A crawler obeys only its own group, so PRIVATE repeats here.
        userAgent: "GPTBot",
        allow: "/",
        disallow: [...PRIVATE, "/*?"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
