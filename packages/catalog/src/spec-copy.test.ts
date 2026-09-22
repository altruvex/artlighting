import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./client";
import { copyProductSpecs } from "./spec-copy";

type Row = Record<string, unknown> & { id: string };
type NestedItem = Row & { translations: { create: Row[] }; measurements: { create: Row[] } };

/**
 * Just enough of the Prisma client for copyProductSpecs, after the pattern
 * in spec-write.test.ts: the two calls it makes and nothing else, so a new
 * query fails here loudly instead of passing against a stub that ignores it.
 */
function fakeDb() {
  let next = 0;
  const id = (prefix: string) => `${prefix}${++next}`;
  const t = {
    groups: [] as Row[],
    groupNames: [] as Row[],
    items: [] as Row[],
    itemTexts: [] as Row[],
    measurements: [] as Row[],
  };
  const byPosition = (a: Row, b: Row) => (a.position as number) - (b.position as number);
  const pick = (row: Row, keys: string[]) => Object.fromEntries(keys.map((key) => [key, row[key]]));

  const db = {
    specGroup: {
      findMany: async ({ where }: { where: { productId: string } }) =>
        t.groups
          .filter((g) => g.productId === where.productId)
          .sort(byPosition)
          .map((g) => ({
            position: g.position,
            translations: t.groupNames.filter((n) => n.groupId === g.id).map((n) => pick(n, ["language", "name"])),
            items: t.items
              .filter((i) => i.groupId === g.id)
              .sort(byPosition)
              .map((i) => ({
                ...pick(i, ["position", "key", "unit", "kind", "comparator", "optionId"]),
                translations: t.itemTexts
                  .filter((x) => x.itemId === i.id)
                  .map((x) => pick(x, ["language", "label", "value"])),
                measurements: t.measurements
                  .filter((m) => m.itemId === i.id)
                  .sort(byPosition)
                  .map((m) => pick(m, ["position", "value", "valueMax", "conditionValue", "conditionUnit"])),
              })),
          })),
      create: async ({
        data,
      }: {
        data: { productId: string; position: number; translations: { create: Row[] }; items: { create: NestedItem[] } };
      }) => {
        const group = { id: id("g"), productId: data.productId, position: data.position };
        t.groups.push(group);
        for (const tr of data.translations.create) t.groupNames.push({ ...tr, id: id("gn"), groupId: group.id });
        for (const { translations, measurements, ...rest } of data.items.create) {
          const item = { ...rest, id: id("i"), groupId: group.id };
          t.items.push(item);
          for (const tr of translations.create) t.itemTexts.push({ ...tr, id: id("it"), itemId: item.id });
          for (const m of measurements.create) t.measurements.push({ ...m, id: id("m"), itemId: item.id });
        }
        return { id: group.id };
      },
    },
  };

  /** Seeds one group: [key, kind, optionId, en, ar, measurements]. */
  function seedGroup(
    productId: string,
    position: number,
    names: [string, string],
    items: [string | null, string, string | null, [string, string | null], [string, string | null], Row[]?][],
  ) {
    const groupId = id("g");
    t.groups.push({ id: groupId, productId, position });
    t.groupNames.push({ id: id("gn"), groupId, language: "en", name: names[0] });
    t.groupNames.push({ id: id("gn"), groupId, language: "ar", name: names[1] });
    items.forEach(([key, kind, optionId, en, ar, measurements = []], index) => {
      const itemId = id("i");
      t.items.push({ id: itemId, groupId, key, position: index * 2, kind, unit: kind === "MEASUREMENT" ? "W" : null, comparator: "EXACT", optionId });
      t.itemTexts.push({ id: id("it"), itemId, language: "en", label: en[0], value: en[1] });
      t.itemTexts.push({ id: id("it"), itemId, language: "ar", label: ar[0], value: ar[1] });
      for (const m of measurements) t.measurements.push({ ...m, id: id("m"), itemId });
    });
  }

  /** A product's specs as the product page reads them, without row ids a copy cannot keep. */
  function specsOf(productId: string) {
    return db.specGroup.findMany({ where: { productId } });
  }

  return { db: db as unknown as Db, raw: db, t, seedGroup, specsOf };
}

describe("copyProductSpecs", () => {
  let fake: ReturnType<typeof fakeDb>;

  beforeEach(() => {
    fake = fakeDb();
    fake.seedGroup("p1", 0, ["Electrical", "الكهرباء"], [
      ["input", "CHOICE", "opt-ac220", ["Input", null], ["الجهد", null]],
      [
        "maximumWattage",
        "MEASUREMENT",
        null,
        ["Maximum wattage", null],
        ["أقصى قدرة", null],
        [
          { id: "", position: 0, value: "12.0000", valueMax: null, conditionValue: "3000.0000", conditionUnit: "K" },
          { id: "", position: 1, value: "15.0000", valueMax: null, conditionValue: "6500.0000", conditionUnit: "K" },
        ],
      ],
    ]);
    fake.seedGroup("p1", 3, ["Physical", "المواصفات المادية"], [
      [null, "TEXT", null, ["Mounting", "Recessed"], ["التركيب", "غاطس"]],
    ]);
    fake.seedGroup("p2", 0, ["Optical", "الإضاءة"], [["cri", "MEASUREMENT", null, ["CRI", null], ["CRI", null]]]);
  });

  it("copies groups, items, both languages and measurements, keeping positions and keys", async () => {
    expect(await copyProductSpecs("p1", "copy", fake.db)).toEqual({ groups: 2, items: 3 });
    expect(await fake.specsOf("copy")).toEqual(await fake.specsOf("p1"));
    expect(fake.t.groups.filter((g) => g.productId === "copy").map((g) => g.position)).toEqual([0, 3]);
  });

  it("points a CHOICE at the same shared vocabulary entry", async () => {
    await copyProductSpecs("p1", "copy", fake.db);
    const [electrical] = await fake.specsOf("copy");
    expect(electrical!.items[0]).toMatchObject({ key: "input", kind: "CHOICE", optionId: "opt-ac220" });
  });

  it("writes new rows, so editing the copy cannot touch the source", async () => {
    const before = fake.t.items.filter((i) => fake.t.groups.find((g) => g.id === i.groupId)?.productId === "p1");
    await copyProductSpecs("p1", "copy", fake.db);
    const copyGroupIds = fake.t.groups.filter((g) => g.productId === "copy").map((g) => g.id);
    const copied = fake.t.items.filter((i) => copyGroupIds.includes(i.groupId as string));
    expect(copied).toHaveLength(3);
    expect(copied.some((i) => before.some((b) => b.id === i.id))).toBe(false);
    for (const text of fake.t.itemTexts.filter((x) => copied.some((i) => i.id === x.itemId))) text.value = "edited";
    const [, physical] = await fake.specsOf("p1");
    expect(physical!.items[0]!.translations).toEqual([
      { language: "en", label: "Mounting", value: "Recessed" },
      { language: "ar", label: "التركيب", value: "غاطس" },
    ]);
  });

  it("leaves a product with no specs with none", async () => {
    expect(await copyProductSpecs("nothing", "copy", fake.db)).toEqual({ groups: 0, items: 0 });
    expect(fake.t.groups.filter((g) => g.productId === "copy")).toEqual([]);
  });

  it("opens its own transaction when handed the client rather than one", async () => {
    let transactions = 0;
    const client = {
      ...fake.raw,
      $transaction: async <T>(fn: (tx: Db) => Promise<T>) => {
        transactions++;
        return fn(fake.db);
      },
    } as unknown as Db;
    await copyProductSpecs("p1", "copy", client);
    expect(transactions).toBe(1);
  });
});
