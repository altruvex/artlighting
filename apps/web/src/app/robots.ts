import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Crawl the storefront; keep crawlers out of checkout, account and API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/preview/", "/*/confirm", "/*/complete", "/*/thank-you", "/*/sign-in", "/*/sign-up"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
