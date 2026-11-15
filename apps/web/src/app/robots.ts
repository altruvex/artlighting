import { SHOP_LANDING_PATHS } from "@/lib/shop-crawl";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

const PRIVATE = ["/api/", "/*/preview/", "/*/confirm", "/*/complete", "/*/thank-you", "/*/sign-in", "/*/sign-up"];

/** Crawl the storefront; keep crawlers out of checkout, account and API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...["", "/en", "/ar"].flatMap((prefix) =>
          SHOP_LANDING_PATHS.filter((path) => path.includes("?")).map((path) => `${prefix}${path}$`),
        )],
        disallow: [...PRIVATE, "/products?", "/*/products?",
          // Only the finite landing pages above are crawlable. Canonicals alone
          // do not stop crawlers traversing every checkbox permutation.
          "/*?*sort=", "/*?*min=", "/*?*max=", "/*?*q=", "/*?*sale="],
      },
      {
        // Specific groups do not inherit the wildcard group's exclusions.
        userAgent: "GPTBot",
        allow: "/",
        disallow: [...PRIVATE, "/*?"],
      },
      {
        userAgent: ["SERankingBacklinksBot", "GoogleOther"],
        disallow: [...PRIVATE, "/products", "/*/products"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
