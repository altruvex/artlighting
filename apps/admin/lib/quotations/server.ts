import "server-only";
import { prisma } from "@repo/database";
import { computeQuotationTotals, type QuotationDiscountInput } from "@repo/pricing";
import type { CustomerSnapshot } from "./schema";

/** The client handed to a `prisma.$transaction` callback (the extended one). */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Allocates the next "Q-2026-0001" in one statement: the upsert takes the
 * row lock, so two quotations created at the same instant cannot share a
 * number, and the counter restarts at 1 when the year turns.
 */
export async function allocateQuotationNumber(tx: Tx, now = new Date()): Promise<string> {
  const year = Number(now.toLocaleString("en-US", { year: "numeric", timeZone: "Africa/Cairo" }));
  const rows = await tx.$queryRaw<{ n: number }[]>`
    INSERT INTO "document_sequences" ("type", "year", "next")
    VALUES ('QUOTATION', ${year}, 2)
    ON CONFLICT ("type") DO UPDATE SET
      "next" = CASE WHEN "document_sequences"."year" = EXCLUDED."year"
                    THEN "document_sequences"."next" + 1 ELSE 2 END,
      "year" = EXCLUDED."year"
    RETURNING "next" - 1 AS n`;
  const n = Number(rows[0]?.n ?? 1);
  return `Q-${year}-${String(n).padStart(4, "0")}`;
}

export function customerSnapshot(customer: {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
}): CustomerSnapshot {
  const { name, companyName, email, phone, address, taxId } = customer;
  return { name, companyName, email, phone, address, taxId };
}

/**
 * Today in Cairo as the stored day convention: the editor's "YYYY-MM-DD"
 * becomes midnight UTC of that date, so days compare as days whatever the
 * server's own time zone is.
 */
export function cairoToday(): Date {
  return new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })}T00:00:00.000Z`);
}

/**
 * A SENT quotation past its date is EXPIRED. Applied when quotations are
 * read rather than by a scheduled job: the admin is the only reader, so the
 * status is right every time anyone can see it, with no cron to deploy.
 *
 * A SENT quotation only goes stale when the Cairo day turns (the one way a
 * date passes) or when one is sent with a date already behind it, which
 * setQuotationStatus settles itself (expireIfStale). So the sweep runs once
 * per day per server instance instead of an UPDATE on every page view; a
 * fresh instance sweeps on its first read, so nothing is missed.
 */
let sweptDay: number | null = null;

export async function expireStaleQuotations(): Promise<void> {
  const today = cairoToday();
  if (sweptDay === today.getTime()) return;
  await prisma.quotation.updateMany({
    where: { status: "SENT", validUntil: { lt: today } },
    data: { status: "EXPIRED" },
  });
  // Only after it succeeded: a failed sweep is retried by the next read.
  sweptDay = today.getTime();
}

/** One quotation just sent with a date already past: expired at once, as the sweep would have. */
export async function expireIfStale(quotationId: string): Promise<void> {
  await prisma.quotation.updateMany({
    where: { id: quotationId, status: "SENT", validUntil: { lt: cairoToday() } },
    data: { status: "EXPIRED" },
  });
}

export interface NormalizedLine {
  productId: string | null;
  variantId: string | null;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  discountRate: string;
}

/**
 * The totals the database stores, recomputed from the lines on the server.
 * The editor shows the same function's result, but the client's figures are
 * never trusted.
 */
export function totalsFor(input: {
  lines: NormalizedLine[];
  discountType: "PERCENTAGE" | "FIXED" | null;
  discountValue: string | null;
  taxRate: string;
}) {
  const discount: QuotationDiscountInput =
    input.discountType === "PERCENTAGE"
      ? { type: "PERCENTAGE", rate: input.discountValue ?? "0" }
      : input.discountType === "FIXED"
        ? { type: "FIXED", amount: input.discountValue ?? "0" }
        : null;
  return computeQuotationTotals({ lines: input.lines, discount, taxRate: input.taxRate });
}
