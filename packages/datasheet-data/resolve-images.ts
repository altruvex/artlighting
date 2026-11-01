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
  process.env.STOREFRONT_BASE_URL ?? "https://artlighting-eg.com"
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

/**
 * Fetches one catalog image (absolute or storefront-relative) as an embedded
 * data URI, or undefined when it cannot be had — a missing picture must not
 * fail the document it sits in.
 */
export async function resolveImageUrl(rawUrl: string | null | undefined): Promise<ImageRef | undefined> {
  return tryResolve(rawUrl ?? undefined);
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

type ImageRole = "PHOTO" | "DRAWING" | "APPLICATION";

interface ProductImageForSheet {
  url: string;
  isPrimary: boolean;
  order: number;
  altText?: string | null;
  role?: ImageRole | null;
}

/**
 * Fallback for images nobody has marked yet: an installed/lifestyle shot
 * named as one in its alt text or file name.
 */
const APPLICATION_IMAGE = /\b(application|lifestyle|installed|in[- ]?situ)\b/i;

function looksLikeApplication(image: { url: string; altText?: string | null }): boolean {
  const raw = image.url.split("/").pop() ?? "";
  let file = raw;
  try {
    file = decodeURIComponent(raw);
  } catch {
    // A stray "%" in a hand-typed file name; match on it as written.
  }
  file = file.replace(/[-_]/g, " ");
  return APPLICATION_IMAGE.test(image.altText ?? "") || APPLICATION_IMAGE.test(file);
}

/**
 * Sorts a product's pictures into the sheet's three slots.
 *
 * A role set in the admin always wins. An unmarked image follows the
 * catalog's convention from before roles existed: the first is the photo and
 * the rest are drawings, unless its name says it is an installed shot.
 * Exported for tests; pure.
 */
export function assignImageSlots<T extends ProductImageForSheet>(
  images: T[]
): { photo?: T; drawings: T[]; application?: T } {
  const ordered = [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.order - b.order;
  });

  const application =
    ordered.find((i) => i.role === "APPLICATION") ??
    ordered.find((i) => !i.role && looksLikeApplication(i));
  const photo =
    ordered.find((i) => i.role === "PHOTO") ??
    ordered.find((i) => !i.role && i !== application);
  const drawings = ordered.filter(
    (i) => i !== photo && i !== application && (i.role === "DRAWING" || !i.role)
  );

  return { photo, drawings, application };
}
