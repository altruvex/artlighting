import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./client";
import { formatSpecValue } from "./spec-format";
import { parseSpecText } from "./spec-text";
import { applySpecChanges, applySpecEdits } from "./spec-write";

/** What the datasheet shows, then read back: the structure must survive. */
function roundTrip(key: string, text: string) {
  const parsed = parseSpecText(key, text);
  return {
    parsed,
    shown: formatSpecValue(
      {
        kind: parsed.kind,
        unit: parsed.unit,
        comparator: parsed.comparator,
        measurements: parsed.measurements,
        text: parsed.text,
        optionLabel: text,
      },
      "en",
    ),
  };
}

describe("parseSpecText reads back what the datasheet displays", () => {
  it.each([
    ["lifeTime", "50,000 h"],
    ["maximumWattage", "15 W"],
    ["colorTemperature", "3,000 / 4,000 / 6,500 K"],
    ["luminousFlux", "1,320 lm (3,000 K) / 1,400 lm (6,500 K)"],
    ["workingTemperature", "-10 to 45 °C"],
    ["beamAngle", "53°"],
    ["cri", "≥ 80"],
  ])("%s %s", (key, text) => {
    const { parsed, shown } = roundTrip(key, text);
    expect(parsed.kind).not.toBe("TEXT");
    expect(shown).toBe(text);
  });

  it("reads the sheet's IP prefix", () => {
    const parsed = parseSpecText("ip", "IP 65");
    expect(parsed.kind).toBe("MEASUREMENT");
    expect(parsed.measurements[0]?.value).toBe("65.0000");
  });

  it("stores a new figure, not the old one", () => {
    expect(parseSpecText("lifeTime", "30,000 h").measurements[0]?.value).toBe("30000.0000");
  });

  it("keeps what it cannot read as text rather than guessing", () => {
    const parsed = parseSpecText("lifeTime", "about thirty thousand hours");
    expect(parsed.kind).toBe("TEXT");
  });

  it("files a material under the shared vocabulary", () => {
    const parsed = parseSpecText("mainMaterial", "Die Cast Aluminum");
    expect(parsed).toMatchObject({ kind: "CHOICE", optionKey: "die_cast_aluminum" });
  });
});

// ─── The write path, against an in-memory stand-in for the spec tables ────

type Row = Record<string, unknown> & { id: string };

/**
 * Just enough of the Prisma client for spec-write: the calls it makes, with
 * the filters it uses. Anything else throws, so a new query in spec-write
 * fails here loudly instead of passing against a stub that ignores it.
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
    options: [] as Row[],
    optionLabels: [] as Row[],
  };

  const positionMatches = (row: Row, where: { position?: { gte: number } }) =>
    !where.position || (row.position as number) >= where.position.gte;
  const increment = (rows: Row[], data: { position: { increment: number } }) => {
    for (const row of rows) row.position = (row.position as number) + data.position.increment;
    return { count: rows.length };
  };
  const productOf = (item: Row) => t.groups.find((g) => g.id === item.groupId)?.productId;

  const db = {
    specGroup: {
      findMany: async ({ where }: { where: { productId: string } }) =>
        t.groups
          .filter((g) => g.productId === where.productId)
          .map((g) => ({
            id: g.id,
            position: g.position,
            translations: t.groupNames.filter((n) => n.groupId === g.id && n.language === "en").map((n) => ({ name: n.name })),
          })),
      create: async ({ data }: { data: { productId: string; position: number; translations: { create: Row[] } } }) => {
        const group = { id: id("g"), productId: data.productId, position: data.position };
        t.groups.push(group);
        for (const tr of data.translations.create) t.groupNames.push({ ...tr, id: id("gn"), groupId: group.id });
        return { id: group.id };
      },
      updateMany: async ({ where, data }: { where: { productId: string; position?: { gte: number } }; data: never }) =>
        increment(t.groups.filter((g) => g.productId === where.productId && positionMatches(g, where)), data),
      deleteMany: async ({ where }: { where: { productId: string; items: { none: object } } }) => {
        const empty = t.groups.filter((g) => g.productId === where.productId && !t.items.some((i) => i.groupId === g.id));
        t.groups = t.groups.filter((g) => !empty.includes(g));
        return { count: empty.length };
      },
    },
    specItem: {
      findMany: async ({ where }: { where: { id?: { in: string[] }; group?: { productId: string }; groupId?: string } }) =>
        t.items
          .filter((i) => (where.id ? where.id.in.includes(i.id) : true))
          .filter((i) => (where.group ? productOf(i) === where.group.productId : true))
          .filter((i) => (where.groupId ? i.groupId === where.groupId : true))
          .map((i) => ({
            ...i,
            translations: t.itemTexts.filter((x) => x.itemId === i.id).map((x) => ({ language: x.language, label: x.label })),
          })),
      create: async ({ data }: { data: Row & { translations: { create: Row[] } } }) => {
        const { translations, ...rest } = data;
        const item = { ...rest, id: id("i"), unit: null, comparator: "EXACT", optionId: null };
        t.items.push(item);
        for (const tr of translations.create) t.itemTexts.push({ ...tr, id: id("it"), itemId: item.id });
        return { id: item.id };
      },
      update: async ({ where, data }: { where: { id: string }; data: Row & { measurements: { create: Row[] } } }) => {
        const { measurements, ...rest } = data;
        const item = t.items.find((i) => i.id === where.id)!;
        Object.assign(item, rest);
        for (const m of measurements.create) t.measurements.push({ ...m, id: id("m"), itemId: item.id });
        return item;
      },
      updateMany: async ({ where, data }: { where: { groupId: string; position?: { gte: number } }; data: never }) =>
        increment(t.items.filter((i) => i.groupId === where.groupId && positionMatches(i, where)), data),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        const gone = new Set(where.id.in);
        t.items = t.items.filter((i) => !gone.has(i.id));
        t.itemTexts = t.itemTexts.filter((x) => !gone.has(x.itemId as string));
        t.measurements = t.measurements.filter((m) => !gone.has(m.itemId as string));
        return { count: gone.size };
      },
    },
    specItemTranslation: {
      updateMany: async ({ where, data }: { where: { itemId: string; language?: string }; data: Row }) => {
        const rows = t.itemTexts.filter((x) => x.itemId === where.itemId && (!where.language || x.language === where.language));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      },
    },
    specMeasurement: {
      deleteMany: async ({ where }: { where: { itemId: string } }) => {
        t.measurements = t.measurements.filter((m) => m.itemId !== where.itemId);
        return { count: 0 };
      },
    },
    specOption: {
      findUnique: async ({ where }: { where: { key: string } }) => t.options.find((o) => o.key === where.key) ?? null,
      create: async ({ data }: { data: { key: string; translations: { create: Row[] } } }) => {
        const option = { id: id("o"), key: data.key };
        t.options.push(option);
        for (const tr of data.translations.create) t.optionLabels.push({ ...tr, id: id("ol"), optionId: option.id });
        return option;
      },
    },
  };

  /** Seeds one group with items: [key, en label, ar label, extra columns]. */
  function seedGroup(productId: string, position: number, names: [string, string], items: [string | null, string, string, Record<string, unknown>?][]) {
    const groupId = id("g");
    t.groups.push({ id: groupId, productId, position });
    t.groupNames.push({ id: id("gn"), groupId, language: "en", name: names[0] });
    t.groupNames.push({ id: id("gn"), groupId, language: "ar", name: names[1] });
    return items.map(([key, en, ar, extra], index) => {
      const itemId = id("i");
      t.items.push({ id: itemId, groupId, key, position: index, kind: "MEASUREMENT", unit: null, comparator: "EXACT", optionId: null, ...extra });
      t.itemTexts.push({ id: id("it"), itemId, language: "en", label: en, value: (extra?.en as string) ?? null });
      t.itemTexts.push({ id: id("it"), itemId, language: "ar", label: ar, value: (extra?.ar as string) ?? null });
      return itemId;
    });
  }

  /** The product's specs as the product page would group them. */
  function specsOf(productId: string) {
    return t.groups
      .filter((g) => g.productId === productId)
      .sort((a, b) => (a.position as number) - (b.position as number))
      .map((g) => ({
        name: t.groupNames.find((n) => n.groupId === g.id && n.language === "en")?.name,
        nameAr: t.groupNames.find((n) => n.groupId === g.id && n.language === "ar")?.name,
        items: t.items
          .filter((i) => i.groupId === g.id)
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((i) => ({
            id: i.id,
            key: i.key,
            kind: i.kind,
            unit: i.unit,
            values: t.measurements.filter((m) => m.itemId === i.id).map((m) => m.value),
            option: t.options.find((o) => o.id === i.optionId)?.key ?? null,
            en: t.itemTexts.find((x) => x.itemId === i.id && x.language === "en"),
            ar: t.itemTexts.find((x) => x.itemId === i.id && x.language === "ar"),
          })),
      }));
  }

  function optionLabel(key: string, language: string) {
    const option = t.options.find((o) => o.key === key);
    return t.optionLabels.find((l) => l.optionId === option?.id && l.language === language)?.label;
  }

  return { db: db as unknown as Db, t, seedGroup, specsOf, optionLabel, addOption: (key: string, en: string, ar: string) => {
    const option = { id: id("o"), key };
    t.options.push(option);
    t.optionLabels.push({ id: id("ol"), optionId: option.id, language: "en", label: en });
    t.optionLabels.push({ id: id("ol"), optionId: option.id, language: "ar", label: ar });
  } };
}

describe("applySpecChanges", () => {
  let fake: ReturnType<typeof fakeDb>;
  let lifeTime: string;
  let mainMaterial: string;
  let note: string;

  beforeEach(() => {
    fake = fakeDb();
    fake.seedGroup("p1", 0, ["Electrical", "الكهرباء"], [
      ["input", "Input", "الجهد", { kind: "CHOICE" }],
      ["powerFactor", "Power factor", "معامل القدرة"],
    ]);
    [mainMaterial, lifeTime, note] = fake.seedGroup("p1", 1, ["Physical", "المواصفات المادية"], [
      ["mainMaterial", "Main material", "الخامة", { kind: "CHOICE" }],
      ["lifeTime", "Lifetime", "العمر الافتراضي", { unit: "h" }],
      [null, "Mounting", "التركيب", { kind: "TEXT", en: "Recessed", ar: "غاطس" }],
    ]) as [string, string, string];
    fake.seedGroup("p2", 0, ["Physical", "المواصفات المادية"], [["ip", "IP rating", "درجة الحماية"]]);
    fake.addOption("die_cast_aluminum", "Die Cast Aluminum", "ألومنيوم مصبوب");
  });

  const item = (id: string) => fake.specsOf("p1").flatMap((g) => g.items).find((i) => i.id === id)!;

  it("stores a figure as a number with no per-language text", async () => {
    const { warnings } = await applySpecChanges("p1", { edits: [{ itemId: lifeTime, value: "30,000 h" }], additions: [] }, fake.db);
    expect(item(lifeTime)).toMatchObject({ kind: "MEASUREMENT", unit: "h", values: ["30000.0000"] });
    expect(item(lifeTime).en?.value).toBeNull();
    expect(item(lifeTime).ar?.value).toBeNull();
    expect(warnings).toEqual([]);
  });

  it("writes both languages of a free-text value when the Arabic is given", async () => {
    const { warnings } = await applySpecChanges(
      "p1",
      { edits: [{ itemId: note, value: "Surface", valueAr: "سطحي" }], additions: [] },
      fake.db,
    );
    expect(item(note)).toMatchObject({ kind: "TEXT" });
    expect(item(note).en?.value).toBe("Surface");
    expect(item(note).ar?.value).toBe("سطحي");
    expect(warnings).toEqual([]);
  });

  it("warns, and keeps the Arabic, when a free-text value changes in English only", async () => {
    const { warnings } = await applySpecEdits("p1", [{ itemId: note, value: "Surface" }], [], fake.db);
    expect(item(note).ar?.value).toBe("غاطس");
    expect(warnings).toEqual([{ kind: "arabicTextUnchanged", label: "Mounting" }]);
  });

  it("fixes only the Arabic of a free-text value", async () => {
    await applySpecChanges("p1", { edits: [{ itemId: note, valueAr: "مدفون" }], additions: [] }, fake.db);
    expect(item(note).en?.value).toBe("Recessed");
    expect(item(note).ar?.value).toBe("مدفون");
  });

  it("links an existing vocabulary entry and never renames it from one product", async () => {
    await applySpecChanges(
      "p1",
      { edits: [{ itemId: mainMaterial, value: "Die Cast Aluminum", valueAr: "اسم آخر" }], additions: [] },
      fake.db,
    );
    expect(item(mainMaterial).option).toBe("die_cast_aluminum");
    expect(fake.optionLabel("die_cast_aluminum", "ar")).toBe("ألومنيوم مصبوب");
  });

  it("names a new vocabulary entry in Arabic when told, and warns when not", async () => {
    const named = await applySpecChanges(
      "p1",
      { edits: [{ itemId: mainMaterial, value: "Brass", valueAr: "نحاس" }], additions: [] },
      fake.db,
    );
    expect(fake.optionLabel("brass", "ar")).toBe("نحاس");
    expect(named.warnings).toEqual([]);

    const unnamed = await applySpecEdits("p1", [{ itemId: mainMaterial, value: "Steel" }], [], fake.db);
    expect(fake.optionLabel("steel", "ar")).toBe("Steel");
    expect(unnamed.warnings).toEqual([{ kind: "arabicCopiedFromEnglish", label: "Main material" }]);
  });

  it("edits labels in each language", async () => {
    await applySpecChanges("p1", { edits: [{ itemId: note, label: "Mount", labelAr: "طريقة التركيب" }], additions: [] }, fake.db);
    expect(item(note).en?.label).toBe("Mount");
    expect(item(note).ar?.label).toBe("طريقة التركيب");
  });

  it("adds a catalogue spec in its layout place, with the catalogue's labels, parsed", async () => {
    const { warnings, createdItemIds } = await applySpecChanges(
      "p1",
      { edits: [], additions: [{ groupName: "Electrical", key: "maximumWattage", value: "15 W" }] },
      fake.db,
    );
    const electrical = fake.specsOf("p1")[0]!;
    expect(electrical.items.map((i) => i.key)).toEqual(["input", "maximumWattage", "powerFactor"]);
    expect(item(createdItemIds[0]!)).toMatchObject({ kind: "MEASUREMENT", unit: "W", values: ["15.0000"] });
    expect(item(createdItemIds[0]!).ar?.label).toBe("أقصى قدرة");
    expect(warnings).toEqual([]);
  });

  it("creates a missing group in the layout's order, named in both languages", async () => {
    await applySpecChanges("p1", { edits: [], additions: [{ groupName: "Optical", key: "cri", value: "≥ 80" }] }, fake.db);
    const groups = fake.specsOf("p1");
    expect(groups.map((g) => g.name)).toEqual(["Electrical", "Optical", "Physical"]);
    expect(groups[1]).toMatchObject({ nameAr: "الإضاءة" });
    expect(groups[1]!.items[0]).toMatchObject({ key: "cri", kind: "MEASUREMENT", values: ["80.0000"] });
  });

  it("adds a free-text row in both languages at the end of its group", async () => {
    const { warnings } = await applySpecChanges(
      "p1",
      {
        edits: [],
        additions: [{ groupName: "Physical", label: "Weight", labelAr: "الوزن", value: "1.2 kg", valueAr: "١٫٢ كجم" }],
      },
      fake.db,
    );
    const last = fake.specsOf("p1")[1]!.items.at(-1)!;
    expect(last).toMatchObject({ key: null, kind: "TEXT" });
    expect(last.en).toMatchObject({ label: "Weight", value: "1.2 kg" });
    expect(last.ar).toMatchObject({ label: "الوزن", value: "١٫٢ كجم" });
    expect(warnings).toEqual([]);
  });

  it("reports a free-text row added in English only", async () => {
    const { warnings } = await applySpecEdits("p1", [], [{ groupName: "Physical", label: "Weight", value: "1.2 kg" }], fake.db);
    expect(fake.specsOf("p1")[1]!.items.at(-1)!.ar).toMatchObject({ label: "Weight", value: "1.2 kg" });
    expect(warnings).toEqual([{ kind: "arabicCopiedFromEnglish", label: "Weight" }]);
  });

  it("removes specs, and a group they leave empty", async () => {
    const [input, powerFactor] = fake.specsOf("p1")[0]!.items.map((i) => i.id);
    await applySpecChanges("p1", { edits: [], additions: [], removals: [input!, powerFactor!, lifeTime] }, fake.db);
    const groups = fake.specsOf("p1");
    expect(groups.map((g) => g.name)).toEqual(["Physical"]);
    expect(groups[0]!.items.map((i) => i.key)).toEqual(["mainMaterial", null]);
  });

  it("refuses a spec that belongs to another product", async () => {
    const foreign = fake.specsOf("p2")[0]!.items[0]!.id;
    await expect(applySpecChanges("p1", { edits: [], additions: [], removals: [foreign] }, fake.db)).rejects.toThrow(
      /does not belong/,
    );
    expect(fake.specsOf("p2")[0]!.items).toHaveLength(1);
  });

  it("refuses to edit and remove the same spec", async () => {
    await expect(
      applySpecChanges("p1", { edits: [{ itemId: note, value: "x" }], additions: [], removals: [note] }, fake.db),
    ).rejects.toThrow(/edited and removed/);
  });
});
