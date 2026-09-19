/**
 * Resolves BETTER_AUTH_SECRET and refuses to run production without a real one.
 *
 * Better Auth itself only rejects its built-in default secret lazily (on the
 * first auth request) and merely warns about short secrets. Session cookies
 * are signed with this value, so a weak or missing secret in production means
 * forgeable sessions — fail at module load instead, with a clear message.
 *
 * Skipped during `next build` so builds don't need runtime secrets; the check
 * runs as soon as the server handles its first request.
 */
const MIN_LENGTH = 32;

export function getAuthSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  if (process.env.NODE_ENV === "production" && !isBuild) {
    if (!secret) {
      throw new Error(
        "BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to the environment.",
      );
    }
    if (secret.length < MIN_LENGTH) {
      throw new Error(`BETTER_AUTH_SECRET must be at least ${MIN_LENGTH} characters long.`);
    }
  }

  // In development an unset secret falls back to Better Auth's own dev default (it warns).
  return secret || undefined;
}
