import { routing } from "@/i18n/routing";

/** Pages a fresh sign-in must not land back on: the auth pages themselves. */
const AUTH_PATHS = ["/sign-in", "/sign-up"];

/**
 * Where to send a customer after they sign in, when a `redirect` query
 * parameter asks for somewhere in particular.
 *
 * Only a relative path on this site passes: it must start with one "/",
 * and not with "//" or "/\" — both of which browsers read as a different
 * host. Anything else (an absolute URL, a scheme, junk) falls back to the
 * default, so a crafted link cannot bounce a fresh sign-in to another site.
 *
 * The result is locale-less, as the i18n router expects: a leading locale
 * segment ("/ar/products") is stripped, or the router would prefix it again
 * and land on "/en/ar/products". The auth pages are refused too, so a
 * sign-in cannot loop back to itself.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // A newline or other control character has no place in a path.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  const path = stripLocale(value);
  // "/ar//evil.com" only becomes protocol-relative once the locale is gone.
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`) || path.startsWith(`${auth}?`))) {
    return fallback;
  }
  return path;
}

function stripLocale(path: string): string {
  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) return path.slice(prefix.length);
  }
  return path;
}
