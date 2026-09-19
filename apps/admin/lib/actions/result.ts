import { getTranslations } from "next-intl/server";
import { AdminAuthError } from "@/lib/auth";

/**
 * What every exported server action returns.
 *
 * Actions used to signal failure by throwing. That works in dev, but a
 * production Next.js build strips the message off any error that escapes a
 * server action and replaces it with an opaque digest — so "Password must be
 * at least 12 characters" reached the admin as "Something went wrong". A
 * returned value is ordinary serialized data and survives the build.
 */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * An error whose message is already translated and meant for the admin to
 * read. `run` passes its message straight through; anything else that escapes
 * an action is a bug or an infrastructure failure whose message could leak
 * internals (Prisma constraint text, upstream stack traces), so it is replaced
 * with a generic one and logged instead.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * `redirect()` and `notFound()` signal themselves by throwing a tagged error
 * that Next has to receive. Swallowing one turns a redirect into a silent
 * no-op, so those are re-thrown untouched.
 */
function isFrameworkControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null | undefined)?.digest;
  if (typeof digest !== "string") return false;
  // NEXT_HTTP_ERROR_FALLBACK is how Next 16 tags notFound()/forbidden();
  // NEXT_NOT_FOUND is the older tag, kept so this stays correct either way.
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

/**
 * Runs an action body and turns its outcome into an `ActionResult`. The
 * authorization call belongs inside `fn` — an `AdminAuthError` thrown by
 * requireAdmin/requirePermission is already translated, so it reaches the
 * admin as the real reason rather than a generic failure.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;

    if (error instanceof AdminAuthError || error instanceof ActionError) {
      return { ok: false, error: error.message };
    }

    // Unexpected: keep the real cause in the server log, show the admin a
    // message that doesn't leak internals.
    console.error("Server action failed", error);
    const t = await getTranslations("Common");
    return { ok: false, error: t("genericError") };
  }
}
