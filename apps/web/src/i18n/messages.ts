import type { AbstractIntlMessages } from "next-intl";

/**
 * The message files, one per part of the site, per locale:
 * messages/<locale>/<file>.json. Each file holds whole namespaces — a
 * namespace lives in exactly one file — so finding a string means knowing
 * which part of the site it belongs to, not scrolling 1,400 lines.
 *
 *   common    header, footer, nav, search, toasts — every page
 *   home      the home page
 *   catalog   shop, product pages, product cards, reviews, collection
 *   checkout  cart, configure, confirm, complete, orders
 *   account   sign-in and sign-up
 *   company   about, contact, projects, services, applications, guide, FAQ
 *   policies  privacy, shipping and the policy pages
 *
 * Adding a file means adding it here. Only CLIENT_NAMESPACES
 * (client-messages.ts) are ever sent to the browser.
 */
export const MESSAGE_FILES = ["common", "home", "catalog", "checkout", "account", "company", "policies"] as const;

export async function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  const parts = await Promise.all(
    MESSAGE_FILES.map(async (file) => [file, (await import(`../../messages/${locale}/${file}.json`)).default as AbstractIntlMessages] as const),
  );
  const messages: AbstractIntlMessages = {};
  for (const [file, part] of parts) {
    for (const [namespace, value] of Object.entries(part)) {
      // Two files defining one namespace would silently drop one of them.
      if (namespace in messages) throw new Error(`Message namespace "${namespace}" is defined twice (again in ${locale}/${file}.json)`);
      messages[namespace] = value;
    }
  }
  return messages;
}
