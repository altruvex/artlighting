import { COMPANY } from "@/lib/company";

/**
 * A WhatsApp link to the showroom (or another of the company's numbers) with
 * the first line already written, so a project enquiry or a question about a
 * product arrives with its context.
 */
export function whatsappLink(message?: string, to: string = COMPANY.phones.showroom) {
  const base = `https://wa.me/${to.replace(/^\+/, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const telLink = (e164: string) => `tel:${e164}`;
