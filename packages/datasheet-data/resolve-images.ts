import type { ImageRef } from "@repo/datasheet";

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Where storefront-relative image paths are served from.
 *
 * EVERY product in the catalog stores its images as storefront-relative
 * paths (e.g. `/indoor/product202/jy-202-15w/JY-202-15W (1).png`) rather than
 * absolute URLs — those files live in `apps/web/public`. Without this base
 * the paths are not fetchable from a server, which is why datasheets
 * previously generated with no product photo at all.
 */
const STOREFRONT_BASE_URL = (
  process.env.STOREFRONT_BASE_URL ?? "https://www.artlighting-eg.com"
).replace(/\/$/, "");

/**
 * Percent-encodes a relative path without destroying its slashes. Product
 * filenames routinely contain spaces and parentheses — `JY-202-15W (1).png`
 * — which `fetch` rejects verbatim, so each segment is encoded on its own.
 * Already-encoded paths are left alone rather than double-encoded.
 */
function toAbsoluteUrl(rawPath: string): string {
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const encoded = path
    .split("/")
    .map((segment) => (/%[0-9A-Fa-f]{2}/.test(segment) ? segment : encodeURIComponent(segment)))
    .join("/");

  return `${STOREFRONT_BASE_URL}${encoded}`;
}

/**
 * Fetches a remote image server-side and returns a base64 data: URI, rather
 * than handing pptxgenjs the raw URL to fetch itself — this gives one clear,
 * catchable error site per image, and makes the resulting PPTX self-contained
 * so it doesn't depend on the source URL still resolving whenever a customer
 * eventually opens the file.
 *
 * The bytes are passed through EXACTLY as served: no resizing, recolouring or
 * background removal. The product photography is Ali's to control.
 */
async function toDataUri(url: string): Promise<ImageRef> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Failed to fetch image "${url}": ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    // A storefront 404 typically returns an HTML page with a 200, which
    // pptxgenjs would happily embed as a corrupt image.
    throw new Error(`Expected an image at "${url}" but got "${contentType}"`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { kind: "data", dataUri: `data:${contentType};base64,${buffer.toString("base64")}` };
}

async function tryResolve(rawUrl: string | undefined): Promise<ImageRef | undefined> {
  if (!rawUrl || !rawUrl.trim()) return undefined;
  try {
    return await toDataUri(toAbsoluteUrl(rawUrl.trim()));
  } catch (err) {
    console.warn(`datasheet: skipping image "${rawUrl}":`, err);
    return undefined;
  }
}

interface ProductForImages {
  images: { url: string; isPrimary: boolean; order: number }[];
  brand?: string | null;
}

/**
 * Manufacturer wordmarks for the BRAND & PARTNERS block, by `Product.brand`.
 * Absent brands simply render no block.
 */
const BRAND_LOGOS: Record<string, string> = {
  balcom: "/brand/balcom-black.png",
};

/** Beyond this the drawing cells are too small to read a dimension from. */
const MAX_DIAGRAMS = 4;

/**
 * Resolves every picture a sheet uses.
 *
 * The catalog's convention — read off the files, not assumed — is that a
 * product's images are ordered `(1)`, `(2)`, `(3)`…, where (1) is the product
 * photograph and everything after it is a DIMENSIONED TECHNICAL DRAWING
 * (measured: `JY-202-15W (2).png` carries 104mm / Ø70mm / tilt callouts).
 * That matches the reference sheets, where BO-011-50W shows one drawing and
 * BO-014-100W shows three.
 *
 * Nothing here caps the product at two images: pass four and the renderer
 * arranges four. A failed fetch degrades that one picture to absent rather
 * than failing the whole sheet.
 */
export async function resolveProductImages(
  product: ProductForImages
): Promise<{ mainImage?: ImageRef; dimensionDiagrams: ImageRef[]; brandLogos: ImageRef[] }> {
  const ordered = [...product.images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.order - b.order;
  });

  // ProductImage is the only source now; the legacy Product.productImages[]
  // array it used to fall back to has been dropped.
  const urls = ordered.map((i) => i.url);
  const logoPath = product.brand ? BRAND_LOGOS[product.brand.trim().toLowerCase()] : undefined;

  const [mainImage, brandLogo, ...diagrams] = await Promise.all([
    tryResolve(urls[0]),
    tryResolve(logoPath),
    ...urls.slice(1, 1 + MAX_DIAGRAMS).map((u) => tryResolve(u)),
  ]);

  return {
    mainImage,
    dimensionDiagrams: diagrams.filter((d): d is ImageRef => d !== undefined),
    brandLogos: brandLogo ? [brandLogo] : [],
  };
}
