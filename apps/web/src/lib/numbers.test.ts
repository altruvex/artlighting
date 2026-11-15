import assert from "node:assert/strict";
import { test } from "node:test";
import { convertArabicToEnglishNumbers, parseLocalizedInt } from "./numbers";

test("price and specification inputs accept Latin, Arabic-Indic and Persian digits", () => {
  for (const value of ["300", "٣٠٠", "۳۰۰", "3٠۰"]) {
    assert.equal(convertArabicToEnglishNumbers(value), "300");
    assert.equal(parseLocalizedInt(value), 300);
  }
  assert.equal(convertArabicToEnglishNumbers("IP٦٥ / ۴۲ W"), "IP65 / 42 W");
  assert.equal(parseLocalizedInt("۳۲ وات"), 32);
  assert.equal(parseLocalizedInt("غير محدد"), undefined);
  assert.equal(parseLocalizedInt(null), undefined);
});
