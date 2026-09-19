import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Runtime client over Neon's pooled connection (DATABASE_URL, host contains
 * "-pooler") through the Neon serverless driver adapter, which Prisma 7
 * requires.
 *
 * Created lazily on first use, not at import: processes that import this
 * package but never query (e.g. the datasheet worker's /convert endpoint)
 * must still boot without DATABASE_URL. One instance per process, reused
 * across dev hot reloads.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (Neon pooled connection string).");
  }
  const base = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  /**
   * `prisma.product.updatePrice(...)` is the only sanctioned way to change
   * Product.price — it atomically writes a PriceHistory row in the same
   * transaction. A generic `product.update` interceptor was considered instead
   * (to catch every write site automatically) but Prisma's client-extension API
   * has no reliable way to thread a `changedBy` value through arbitrary update
   * calls, and it would silently miss price changes made via upsert/updateMany/
   * raw SQL anyway — an explicit method that admin code must call is more honest
   * about what's actually covered.
   */
  return base.$extends({
    name: "product-price-history",
    model: {
      product: {
        async updatePrice(productId: string, newPrice: number, changedBy: string) {
          return base.$transaction(async (tx) => {
            const current = await tx.product.findUniqueOrThrow({
              where: { id: productId },
              select: { price: true },
            });

            const updated = await tx.product.update({
              where: { id: productId },
              data: { price: newPrice },
            });

            if (current.price !== newPrice) {
              await tx.priceHistory.create({
                data: { productId, oldPrice: current.price, newPrice, changedBy },
              });
            }

            return updated;
          });
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

declare global {
  var __prisma: ExtendedPrismaClient | undefined;
}

function getClient(): ExtendedPrismaClient {
  if (!globalThis.__prisma) {
    const client = createClient();
    // In production each process just keeps its module-level instance; the
    // global only matters for dev hot reloads, but caching it always is harmless.
    globalThis.__prisma = client;
  }
  return globalThis.__prisma;
}

export const prisma = new Proxy({} as ExtendedPrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export * from "./generated/prisma/client";
