import { money, multiplyMoney, serializeMoney } from "@repo/money";
import { z } from "zod";
import { prisma, type Db } from "./client";
import { moneySchema } from "./schemas";

/**
 * The bulbs a chandelier is sold with.
 *
 * A fixture with arms does not light without them, so choosing one is not
 * an upgrade the customer may decline — it is part of buying the fixture.
 * That is the whole reason this is a table: the two wattages and their
 * prices used to be a TypeScript constant, duplicated into the component
 * that read it, and the two copies had already drifted apart.
 *
 * What a fixture costs to light is the bulb's price times its arms, and
 * `Product.hNumber` is the arm count. A product with no arms — every LED
 * chandelier, and everything outside the chandelier family — offers no
 * bulbs at all.
 */

export const bulbBases = ["E27", "E14"] as const;
export type BulbBase = (typeof bulbBases)[number];

export const bulbInputSchema = z.object({
  /** Language-neutral and stable; lowercase so it reads as an identifier. */
  key: z
    .string()
    .trim()
    .min(1, "Give the bulb a key")
    .max(60, "The key is too long — keep it under 60 characters")
    .regex(/^[a-z0-9_]+$/, "A key is lowercase letters, digits and underscores, e.g. candle_3w"),
  wattage: z
    .number()
    .int("Wattage is a whole number")
    .positive("A bulb has to draw more than 0 watts"),
  base: z.enum(bulbBases),
  price: moneySchema,
  isActive: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
  /** The shape, per language: "Candle" / "بلحة". The wattage is not repeated. */
  names: z.object({
    en: z.string().trim().min(1, "Give the bulb an English name"),
    ar: z.string().trim().min(1, "اكتب اسم اللمبة بالعربي"),
  }),
});

export type BulbInput = z.infer<typeof bulbInputSchema>;

export function bulbSelect() {
  return {
    id: true,
    key: true,
    wattage: true,
    base: true,
    price: true,
    isActive: true,
    position: true,
    translations: { select: { language: true, name: true } },
  } as const;
}

export async function listBulbs(db: Db = prisma, options: { activeOnly?: boolean } = {}) {
  return db.bulb.findMany({
    where: options.activeOnly ? { isActive: true } : undefined,
    select: bulbSelect(),
    orderBy: [{ position: "asc" }, { wattage: "asc" }],
  });
}

export async function createBulb(input: BulbInput, db: Db = prisma) {
  const data = bulbInputSchema.parse(input);
  return db.bulb.create({
    data: {
      key: data.key,
      wattage: data.wattage,
      base: data.base,
      price: money(data.price).toFixed(2),
      isActive: data.isActive,
      position: data.position,
      translations: {
        create: [
          { language: "en", name: data.names.en },
          { language: "ar", name: data.names.ar },
        ],
      },
    },
    select: bulbSelect(),
  });
}

export async function updateBulb(id: string, input: BulbInput, db: Db = prisma) {
  const data = bulbInputSchema.parse(input);
  return runInTransaction(db, async (tx) => {
    await tx.bulb.update({
      where: { id },
      data: {
        key: data.key,
        wattage: data.wattage,
        base: data.base,
        price: money(data.price).toFixed(2),
        isActive: data.isActive,
        position: data.position,
      },
    });
    for (const [language, name] of [["en", data.names.en], ["ar", data.names.ar]] as const) {
      await tx.bulbTranslation.upsert({
        where: { bulbId_language: { bulbId: id, language } },
        create: { bulbId: id, language, name },
        update: { name },
      });
    }
    return tx.bulb.findUniqueOrThrow({ where: { id }, select: bulbSelect() });
  });
}

/**
 * Retires a bulb rather than deleting it.
 *
 * Deleting would take the row out from under every configuration that
 * chose it. Past orders keep what they cost either way — the amount is on
 * the configuration — but the name would be gone.
 */
export async function setBulbActive(id: string, isActive: boolean, db: Db = prisma) {
  return db.bulb.update({ where: { id }, data: { isActive }, select: bulbSelect() });
}

/** A bulb no product offers and no configuration ever chose can be removed. */
export async function deleteBulbIfUnused(id: string, db: Db = prisma) {
  const [onProducts, onConfigurations] = await Promise.all([
    db.productBulb.count({ where: { bulbId: id } }),
    db.configuration.count({ where: { bulbId: id } }),
  ]);
  if (onProducts > 0 || onConfigurations > 0) {
    throw new BulbInUseError(onProducts, onConfigurations);
  }
  await db.bulb.delete({ where: { id } });
}

export class BulbInUseError extends Error {
  constructor(
    readonly products: number,
    readonly configurations: number,
  ) {
    super(
      `This bulb is still in use — ${products} product(s) and ${configurations} saved configuration(s). ` +
        "Turn it off instead, which keeps those readable.",
    );
    this.name = "BulbInUseError";
  }
}

/**
 * Sets which bulbs a product offers, and which one it is sold with.
 *
 * The default is written last and on its own, because the database holds a
 * partial unique index over `isDefault`: clearing the old one and setting
 * the new one in a single statement would collide mid-way.
 */
export async function setProductBulbs(
  productId: string,
  bulbIds: string[],
  defaultBulbId: string | null,
  db: Db = prisma,
) {
  const unique = [...new Set(bulbIds)];
  if (defaultBulbId && !unique.includes(defaultBulbId)) {
    throw new Error("The default bulb has to be one of the bulbs the product offers");
  }
  if (unique.length > 0 && !defaultBulbId) {
    throw new Error("A fixture that takes bulbs has to be sold with one — pick the default");
  }

  return runInTransaction(db, async (tx) => {
    await tx.productBulb.deleteMany({ where: { productId, bulbId: { notIn: unique } } });
    // Defaults come off first so the partial unique index never sees two.
    await tx.productBulb.updateMany({ where: { productId }, data: { isDefault: false } });
    for (const [position, bulbId] of unique.entries()) {
      await tx.productBulb.upsert({
        where: { productId_bulbId: { productId, bulbId } },
        create: { productId, bulbId, position, isDefault: false },
        update: { position },
      });
    }
    if (defaultBulbId) {
      await tx.productBulb.update({
        where: { productId_bulbId: { productId, bulbId: defaultBulbId } },
        data: { isDefault: true },
      });
    }
  });
}

export function productBulbSelect() {
  return {
    orderBy: [{ position: "asc" as const }],
    select: {
      isDefault: true,
      position: true,
      bulb: { select: bulbSelect() },
    },
  } as const;
}

type BulbRow = {
  id: string;
  key: string;
  wattage: number;
  base: BulbBase;
  price: unknown;
  isActive: boolean;
  position: number;
  translations: { language: string; name: string }[];
};

export interface BulbChoice {
  id: string;
  key: string;
  wattage: number;
  base: BulbBase;
  /** Per bulb, serialized (see @repo/money): never a float. */
  price: string;
  /** The bulb's price times the fixture's arms — what choosing it adds. */
  total: string;
  /** The shape in this locale; the wattage is rendered beside it. */
  name: string;
  isDefault: boolean;
}

/**
 * What a product offers, priced for its arm count and named for one locale.
 *
 * Returns nothing for a fixture with no arms, which is the rule Ali set:
 * the choice appears only where a bulb actually goes.
 */
export function bulbChoices(
  rows: { isDefault: boolean; bulb: BulbRow }[] | null | undefined,
  hNumber: number | null | undefined,
  language: string,
): BulbChoice[] {
  const arms = hNumber ?? 0;
  if (arms <= 0) return [];
  return (rows ?? [])
    .filter((row) => row.bulb.isActive)
    .map((row) => ({
      id: row.bulb.id,
      key: row.bulb.key,
      wattage: row.bulb.wattage,
      base: row.bulb.base,
      price: serializeMoney(row.bulb.price as never),
      total: serializeMoney(multiplyMoney(row.bulb.price as never, arms)),
      name:
        row.bulb.translations.find((t) => t.language === language)?.name ??
        row.bulb.translations.find((t) => t.language === "en")?.name ??
        row.bulb.key,
      isDefault: row.isDefault,
    }));
}

/** What the chosen bulbs add to a fixture: price per bulb times its arms. */
export function bulbPriceIncrease(
  pricePerBulb: unknown,
  hNumber: number | null | undefined,
): string {
  const arms = hNumber ?? 0;
  if (arms <= 0) return serializeMoney(0);
  return serializeMoney(multiplyMoney(pricePerBulb as never, arms));
}

type Transactional = { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> };

async function runInTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  // `"$transaction" in db` is false: the client is a Proxy with only a get
  // trap, so the check has to go through one.
  const candidate = db as unknown as Partial<Transactional>;
  if (typeof candidate.$transaction !== "function") return fn(db);
  return (candidate as Transactional).$transaction((tx) => fn(tx as Db));
}
