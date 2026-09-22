import { type Db, prisma } from "./client";

/**
 * Copies one product's spec groups onto another: groups, items and
 * measurements in both languages, with their positions and keys. A CHOICE
 * item points at the same vocabulary entry as the source rather than a copy
 * of it — the vocabulary is shared, and a second "die_cast_aluminum" would
 * be two entries to translate for one fact.
 *
 * Meant for a product created a moment ago (duplicateProduct), so the target
 * is expected to have no specs of its own. Pass a transaction handle to make
 * the copy part of a larger write; given the client, it opens its own.
 */
export async function copyProductSpecs(
  fromProductId: string,
  toProductId: string,
  db: Db = prisma
): Promise<{ groups: number; items: number }> {
  const body = async (tx: Db) => {
    const groups = await tx.specGroup.findMany({
      where: { productId: fromProductId },
      orderBy: { position: "asc" },
      select: {
        position: true,
        translations: { select: { language: true, name: true } },
        items: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            key: true,
            unit: true,
            kind: true,
            comparator: true,
            optionId: true,
            translations: { select: { language: true, label: true, value: true } },
            measurements: {
              orderBy: { position: "asc" },
              select: { position: true, value: true, valueMax: true, conditionValue: true, conditionUnit: true },
            },
          },
        },
      },
    });

    let items = 0;
    for (const group of groups) {
      await tx.specGroup.create({
        select: { id: true },
        data: {
          productId: toProductId,
          position: group.position,
          translations: { create: group.translations },
          items: {
            create: group.items.map(({ translations, measurements, ...item }) => ({
              ...item,
              translations: { create: translations },
              measurements: { create: measurements },
            })),
          },
        },
      });
      items += group.items.length;
    }
    return { groups: groups.length, items };
  };

  const run = (db as unknown as { $transaction?: <T>(fn: (tx: Db) => Promise<T>) => Promise<T> }).$transaction;
  if (typeof run !== "function") return body(db);
  return run.call(db, body) as Promise<{ groups: number; items: number }>;
}
