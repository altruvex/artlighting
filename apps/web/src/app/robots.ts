import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Crawl the storefront; keep crawlers out of checkout, account and API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/preview/", "/*/confirm", "/*/complete", "/*/thank-you", "/*/sign-in", "/*/sign-up",
        // Shop sort/price/search/sale combinations: each is an uncached
        // render for the same products (canonicals already fold them).
        // family, type, brand and page stay crawlable.
        "/*?*sort=", "/*?*min=", "/*?*max=", "/*?*q=", "/*?*sale="],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
