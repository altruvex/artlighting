import "server-only";

/**
 * Delivery seam for the account emails Better Auth triggers (verification,
 * password reset).
 *
 * There is no mail provider yet — Resend and the React Email templates land
 * in Phase 5, and this is the single place that changes then. Until that
 * happens the link is logged so the flow is testable in development, and a
 * production miss is logged as an error rather than failing silently: a
 * customer waiting for a reset link that nobody sends should be visible in
 * the logs.
 */
export type AuthEmailKind = "verify-email" | "reset-password";

export async function deliverAuthEmail({
  kind,
  to,
  url,
}: {
  kind: AuthEmailKind;
  to: string;
  url: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error(
      `[auth-email] ${kind} for ${to} was not delivered: no mail provider is configured yet (Phase 5).`,
    );
    return;
  }

  console.info(`[auth-email] ${kind} for ${to}: ${url}`);
}
