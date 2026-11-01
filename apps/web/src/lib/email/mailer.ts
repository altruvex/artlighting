import "server-only";

import { Resend } from "resend";

/**
 * The one place mail leaves the storefront.
 *
 * Resend, configured from three variables (see .env.example):
 * RESEND_API_KEY, EMAIL_FROM and ORDER_NOTIFY_EMAIL. With no key the
 * message is logged instead of sent, so checkout and sign-up keep working
 * in development and a missing key in production is loud in the logs
 * rather than a silent gap.
 *
 * Sending never throws to the caller: an order that was placed must stay
 * placed even when the mail provider is down. The failure is logged with
 * enough to resend by hand.
 */

let client: Resend | null | undefined;

function resend(): Resend | null {
  if (client === undefined) {
    const key = process.env.RESEND_API_KEY;
    client = key ? new Resend(key) : null;
  }
  return client;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Art Lighting <orders@artlighting-eg.com>";

/** Where the shop's copy of every order goes. */
export function orderNotifyRecipients(): string[] {
  return (process.env.ORDER_NOTIFY_EMAIL ?? "artlighting10@gmail.com")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
  /**
   * Resend drops a second send with the same key for 24 hours — so a
   * confirmation retried by a double click, or a request replayed, sends
   * one email, not two.
   */
  idempotencyKey?: string;
  /** For the log line only. */
  tag: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const api = resend();
  if (!api) {
    const log = process.env.NODE_ENV === "production" ? console.error : console.info;
    log(`[email] ${email.tag} to ${[email.to].flat().join(", ")} not sent: RESEND_API_KEY is not set. Subject: ${email.subject}`);
    return false;
  }

  try {
    const { error } = await api.emails.send(
      {
        from: EMAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: email.replyTo,
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error) {
      console.error(`[email] ${email.tag} to ${[email.to].flat().join(", ")} failed: ${error.name}: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] ${email.tag} to ${[email.to].flat().join(", ")} failed:`, error);
    return false;
  }
}

/** Everything interpolated into an email body goes through this. */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
