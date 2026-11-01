import type { AbstractIntlMessages } from "next-intl";

/**
 * The message namespaces the browser needs: those used by Client
 * Components, and by shared components rendered inside one.
 *
 * The root layout used to send every message to the client — ~60 KB of JSON
 * in every page's payload, most of it text only the server ever renders
 * (policies, about, guide, home). `pnpm lint` runs
 * scripts/check-client-namespaces.mjs, which fails if a client component
 * uses a namespace missing here, so the list cannot silently fall behind.
 *
 * One namespace per line, quoted: the check script reads this file.
 */
export const CLIENT_NAMESPACES = [
  "ProductBulbButtons",
  "a11y",
  "auth",
  "auth-section",
  "cart",
  "colorTemperature",
  "complete",
  "confirm",
  "family",
  "footer",
  "header",
  "login",
  "nav",
  "order",
  "pdp",
  "preview",
  "product-card",
  "product-description",
  "product-dialog",
  "product-ip",
  "product-main-info",
  "product-notifications",
  "products",
  "promo",
  "recent",
  "reviews",
  "search",
  "shop",
  "steps",
  "thankYou",
  "toast",
  // Read by the shared @repo/ui components (the dialog close label), which
  // scripts/check-client-namespaces.mjs does not follow into.
  "ui",
] as const;

export function pickClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return Object.fromEntries(CLIENT_NAMESPACES.filter((name) => name in messages).map((name) => [name, messages[name]]));
}
