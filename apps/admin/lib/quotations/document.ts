import "server-only";
import { prisma } from "@repo/database";
import type { ImageRef, QuotationDocumentData } from "@repo/datasheet";
import { resolveImageUrl } from "@repo/datasheet-data";
import { serializeMoney, serializeRate } from "@repo/money";
import type { CustomerSnapshot } from "./schema";

/** Image fetches in flight at once — a 60-line quotation must not open 60 sockets. */
const IMAGE_CONCURRENCY = 6;

async function resolveAll(urls: (string | null)[]): Promise<(ImageRef | undefined)[]> {
  const out: (ImageRef | undefined)[] = new Array(urls.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, urls.length) }, async () => {
      while (next < urls.length) {
        const i = next++;
        out[i] = await resolveImageUrl(urls[i]);
      }
    }),
  );
  return out;
}

/**
 * The quotation as a document reads it: stored lines and stored totals only.
 * Nothing is re-read from the product, so the file matches what was saved —
 * and, once sent, what the customer received.
 */
export async function getQuotationDocumentData(
  quotationId: string,
): Promise<QuotationDocumentData | null> {
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      lines: { orderBy: { position: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
  if (!q) return null;

  const customer = q.customerSnapshot as unknown as CustomerSnapshot;
  const images = await resolveAll(q.lines.map((l) => l.imageUrl));

  return {
    number: q.number,
    issueDate: q.issueDate,
    validUntil: q.validUntil,
    currency: q.currency,
    subject: q.subject,
    preparedBy: q.createdBy.name || null,
    customer,
    lines: q.lines.map((line, i) => ({
      sku: line.sku,
      name: line.name,
      description: line.description,
      image: images[i],
      quantity: line.quantity,
      unitPrice: serializeMoney(line.unitPrice),
      discountRate: serializeRate(line.discountRate),
      lineTotal: serializeMoney(line.lineTotal),
    })),
    totals: {
      subtotal: serializeMoney(q.subtotal),
      discountTotal: serializeMoney(q.discountTotal),
      discountRate: q.discountType === "PERCENTAGE" && q.discountRate ? serializeRate(q.discountRate) : null,
      taxRate: serializeRate(q.taxRate),
      taxTotal: serializeMoney(q.taxTotal),
      grandTotal: serializeMoney(q.grandTotal),
    },
    terms: q.terms,
  };
}
