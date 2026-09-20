import { prisma } from "@repo/database";

/**
 * Everything in this package takes a `Db`: either the shared client or a
 * transaction handle. That is what lets a caller wrap several catalog
 * operations in one transaction, and what keeps the stock sync inside the
 * same transaction as the write that caused it.
 */
export type Db = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export { prisma };
