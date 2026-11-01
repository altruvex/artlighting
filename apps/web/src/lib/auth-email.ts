import "server-only";

import { emailLayout, GOLD, MUTED } from "@/lib/email/layout";
import { escapeHtml, sendEmail } from "@/lib/email/mailer";

/**
 * Delivery for the account emails Better Auth triggers (verification,
 * password reset), through the same Resend sender as the order emails.
 * Without RESEND_API_KEY the link is logged, so the flow stays testable in
 * development — see lib/email/mailer.
 */
export type AuthEmailKind = "verify-email" | "reset-password";

const COPY: Record<AuthEmailKind, { subject: string; title: string; body: string; cta: string }> = {
  "verify-email": {
    subject: "Confirm your email — Art Lighting | تأكيد بريدك الإلكتروني — آرت لايتنج",
    title: "Confirm your email",
    body: "Confirm this address to finish creating your Art Lighting account. The link expires soon; if you did not sign up, ignore this email.",
    cta: "Confirm email",
  },
  "reset-password": {
    subject: "Reset your password — Art Lighting | إعادة تعيين كلمة المرور — آرت لايتنج",
    title: "Reset your password",
    body: "Someone asked to reset the password for this Art Lighting account. If it was you, choose a new one below; if not, ignore this email and nothing will change.",
    cta: "Choose a new password",
  },
};

const COPY_AR: Record<AuthEmailKind, { title: string; body: string; cta: string }> = {
  "verify-email": {
    title: "أكّد بريدك الإلكتروني",
    body: "أكّد هذا العنوان لإكمال إنشاء حسابك في آرت لايتنج. إذا لم تقم بالتسجيل، تجاهل هذه الرسالة.",
    cta: "تأكيد البريد",
  },
  "reset-password": {
    title: "إعادة تعيين كلمة المرور",
    body: "طُلبت إعادة تعيين كلمة المرور لهذا الحساب. إذا كنت أنت، اختر كلمة مرور جديدة؛ وإن لم تكن، تجاهل الرسالة ولن يتغير شيء.",
    cta: "اختيار كلمة مرور جديدة",
  },
};

export async function deliverAuthEmail({ kind, to, url }: { kind: AuthEmailKind; to: string; url: string }): Promise<void> {
  const en = COPY[kind];
  const ar = COPY_AR[kind];
  const button = (label: string) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px;">${escapeHtml(label)}</a>`;

  // Both languages in one message: the account is created before we know
  // which the customer prefers for mail.
  const body = `
<p style="margin:0 0 8px;font-size:20px;font-weight:600;">${en.title}</p>
<p style="margin:0 0 20px;">${en.body}</p>
<p style="margin:0 0 28px;">${button(en.cta)}</p>
<div dir="rtl" style="text-align:right;border-top:1px solid #e4dfd8;padding-top:20px;">
<p style="margin:0 0 8px;font-size:20px;font-weight:600;">${ar.title}</p>
<p style="margin:0 0 20px;">${ar.body}</p>
<p style="margin:0 0 20px;">${button(ar.cta)}</p>
</div>
<p style="margin:0 0 12px;font-size:12px;color:${MUTED};word-break:break-all;">${escapeHtml(url)}</p>`;

  const sent = await sendEmail({
    to,
    subject: en.subject,
    html: emailLayout({ locale: "en", preheader: en.title, body }),
    text: `${en.title}\n${en.body}\n${url}\n\n${ar.title}\n${ar.body}\n${url}`,
    tag: kind,
  });
  if (!sent && process.env.NODE_ENV !== "production") console.info(`[auth-email] ${kind} for ${to}: ${url}`);
}
