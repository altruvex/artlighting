import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { locale as rootLocale } from 'next/root-params';
import { routing } from './routing';
import { loadMessages } from './messages';

/**
 * The locale for a render: an explicit override, else the `[locale]` root
 * param, else (Server Actions and Route Handlers, where root params are not
 * available) the header the middleware sets.
 *
 * Reading the root param rather than the header is what lets pages
 * prerender: a header read makes every page render per request.
 */
async function resolveLocale(override: string | undefined, requestLocale: Promise<string | undefined>) {
    if (override) return override;
    try {
        return await rootLocale();
    } catch {
        return await requestLocale;
    }
}

export default getRequestConfig(async ({ locale: override, requestLocale }) => {
    const requested = await resolveLocale(override, requestLocale);
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    return {
        locale,
        messages: await loadMessages(locale)
    };
});
