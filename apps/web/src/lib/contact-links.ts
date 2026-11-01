import { COMPANY } from "@/lib/company";

/**
 * A WhatsApp link to the showroom with the first line already written, so a
 * project enquiry or a question about a product arrives with its context.
 */
export function whatsappLink(message?: string) {
  const base = `https://wa.me/${COMPANY.phones.showroom.replace(/^\+/, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const telLink = (e164: string) => `tel:${e164}`;
