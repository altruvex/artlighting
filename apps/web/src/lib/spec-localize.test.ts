import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeSpecGroups, type RawSpecGroup } from "./spec-localize";

function measurement(
  overrides: Partial<RawSpecGroup["items"][number]> = {},
): RawSpecGroup["items"][number] {
  return {
    key: "powerFactor",
    kind: "MEASUREMENT",
    unit: null,
    comparator: "EXACT",
    measurements: [
      {
        value: "0.9754",
        valueMax: null,
        conditionValue: null,
        conditionUnit: null,
      },
    ],
    option: null,
    translations: [{ language: "en", label: "Power factor", value: null }],
    ...overrides,
  };
}

test("missing Arabic group and field labels retain stored values and specification precision", () => {
  const groups: RawSpecGroup[] = [
    {
      translations: [{ language: "en", name: "Electrical" }],
      items: [measurement()],
    },
  ];
  const ar = localizeSpecGroups(groups, "ar");
  assert.equal(ar[0]?.items[0]?.numeric, 0.9754);
  assert.equal(ar[0]?.items[0]?.value, "٠٫٩٧٥٤");
  assert.equal(ar[0]?.items.length, 1);
});

test("unnamed custom groups and unkeyed specs are visible with a usable fallback", () => {
  const groups: RawSpecGroup[] = [
    {
      translations: [],
      items: [
        measurement({
          key: null,
          kind: "TEXT",
          measurements: [],
          translations: [
            { language: "en", label: "Diffuser", value: "Clear acrylic" },
          ],
        }),
      ],
    },
  ];
  const ar = localizeSpecGroups(groups, "ar");
  assert.equal(ar[0]?.name, "مواصفات إضافية");
  assert.equal(ar[0]?.items[0]?.label, "Diffuser");
  assert.equal(ar[0]?.items[0]?.value, "Clear acrylic");
});

test("fallback is per field: a translated label cannot hide English text or choice values", () => {
  const groups: RawSpecGroup[] = [
    {
      translations: [{ language: "ar", name: "المواصفات" }],
      items: [
        measurement({
          kind: "TEXT",
          measurements: [],
          translations: [
            { language: "ar", label: "الناشر", value: "—" },
            { language: "en", label: "Diffuser", value: "Glass" },
          ],
        }),
        measurement({
          key: "mainMaterial",
          kind: "CHOICE",
          measurements: [],
          option: {
            key: "aluminum",
            translations: [{ language: "en", label: "Aluminum" }],
          },
        }),
      ],
    },
  ];
  const ar = localizeSpecGroups(groups, "ar");
  assert.deepEqual(
    ar[0]?.items.map((item) => item.value),
    ["Glass", "Aluminum"],
  );
  assert.equal(ar[0]?.items[0]?.label, "الناشر");
});

test("zero, negative ranges and condition measurements keep their stored figures", () => {
  const groups: RawSpecGroup[] = [
    {
      translations: [],
      items: [
        measurement({
          measurements: [
            {
              value: "0",
              valueMax: null,
              conditionValue: "0",
              conditionUnit: "°C",
            },
          ],
        }),
        measurement({
          key: "workingTemperature",
          kind: "RANGE",
          unit: "°C",
          measurements: [
            {
              value: "-10.1254",
              valueMax: "45.9876",
              conditionValue: null,
              conditionUnit: null,
            },
          ],
        }),
      ],
    },
  ];
  const en = localizeSpecGroups(groups, "en");
  assert.equal(en[0]?.items[0]?.numeric, 0);
  assert.deepEqual(en[0]?.items[0]?.parts, [{ text: "0", condition: "0 °C" }]);
  assert.equal(en[0]?.items[1]?.value, "-10.1254 to 45.9876 °C");
});
