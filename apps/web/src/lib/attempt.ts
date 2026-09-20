import { unstable_rethrow } from "next/navigation";

/**
 * Runs a loader and reports its failure as a value instead of an exception.
 *
 * A page cannot put `notFound()` inside a `try`. It works by throwing, so
 * the `catch` swallows the interrupt: the not-found UI never renders, and
 * Next never injects `<meta name="robots" content="noindex">` — which
 * leaves an error page indexable at a URL that does not exist. The category
 * routes did exactly that, and served `NEXT_HTTP_ERROR_FALLBACK;404` to the
 * reader as the error text.
 *
 * Keeping the `try` around the *loading* and checking the result afterwards
 * means the interrupt is never inside one. `unstable_rethrow` covers the
 * case where a loader itself calls `notFound()` or `redirect()`; it is the
 * API Next provides for this and must be the first thing in the catch.
 */
export async function attempt<T>(
  load: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error };
  }
}
