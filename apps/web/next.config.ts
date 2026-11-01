import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { upstashRest } = createRequire(import.meta.url)("./upstash-rest.cjs") as typeof import("./upstash-rest.cjs");

/**
 * Shared cache invalidation across instances (see cache-handler.cjs). Only
 * self-hosted with Redis configured: on Vercel the platform propagates
 * revalidateTag itself, and with one instance there is nothing to share.
 * SHARED_CACHE_TAGS=off opts out.
 */
const sharedCacheTags =
  upstashRest() !== null &&
  !process.env.VERCEL &&
  process.env.SHARED_CACHE_TAGS !== "off";

const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
].filter(Boolean) as string[];

function getCorsOriginHeader() {
  if (allowedOrigins.length === 0) {
    return "https://artlighting-eg.com";
  }
  return allowedOrigins[0];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gzip in Node costs CPU on every response — under load it was the main
  // cost of serving a cached page. Behind a CDN or nginx that compresses,
  // set NEXT_COMPRESS=off and let them do it; Vercel ignores this setting.
  compress: process.env.NEXT_COMPRESS !== "off",
  // Enables `"use cache"`. Catalogue reads are cached per locale and
  // dropped by tag when the admin or an order changes them (see
  // src/lib/cache.server.ts and src/app/api/revalidate).
  cacheComponents: true,
  // A product added after the build has no prerendered page yet: its first
  // visitor gets the page's shell at once and the full page is prerendered
  // in the background for everyone after (see generateStaticParams on the
  // product routes).
  partialPrefetching: true,
  ...(sharedCacheTags && {
    cacheHandlers: { default: fileURLToPath(new URL("./cache-handler.cjs", import.meta.url)) },
  }),
  cacheLife: {
    // Products, prices, stock and promotions. Every admin write, order and
    // discount boundary invalidates this directly; the hour is only the
    // safety net for a missed invalidation (and each refresh is a billed
    // function run plus an ISR write, so a short net costs real money).
    catalogue: { stale: 60, revalidate: 3600, expire: 86400 },
  },
  experimental: {
    // Every product page is prerendered at build (~480 pages). At the
    // default concurrency the Neon driver's websockets failed under the
    // burst of parallel queries and took the build down; retry what fails
    // and keep each worker to a few pages at a time.
    staticGenerationMaxConcurrency: 4,
    staticGenerationRetryCount: 3,
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    // What the landing imagery asks for; unlisted qualities are
    // coerced to 75 and warned about on every render.
    qualities: [60, 70, 75],
    // Default widths minus 3840: heroes are sized to 1536px, so 2048 covers
    // a 2x screen and the 4K variant only cost transformations and transfer.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Optimised images are re-transformed when this expires (default 4h).
    // Cloudinary URLs are versioned, so a month is safe; a /public file
    // replaced under the same name needs a new name to show at once.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
  },
  async redirects() {
    return [
      {
        // The API used to live inside the [locale] segment. Anything still
        // calling the old path keeps working.
        source: "/:locale(en|ar)/api/:path*",
        destination: "/api/:path*",
        // 308, not 307: the move is permanent, and both preserve the method
        // and body so a POST stays a POST.
        permanent: true,
      },
    ];
  },
  async headers() {
    const corsOrigin = getCorsOriginHeader();

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
              "connect-src 'self' https://*.upstash.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: corsOrigin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);