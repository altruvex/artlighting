import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCacheableShopQuery,
  normalizeShopParams,
  parseShopQuery,
} from "./shop-query";

test("equivalent URLs share one render key and generate the same filter links", () => {
  assert.deepEqual(
    normalizeShopParams({
      family: ["outdoor,indoor", "outdoor"],
      brand: ["mister-led,balcom", "balcom"],
      page: "01",
      sort: "featured",
      sale: "0",
      utm_source: "campaign",
    }),
    normalizeShopParams({
      brand: "balcom,mister-led",
      family: "indoor,outdoor",
    }),
  );
  assert.deepEqual(
    normalizeShopParams({
      page: "not-a-page",
      sort: "unknown",
      brand: "unknown",
    }),
    {},
  );
});

test("normalization preserves searches, prices and selected page", () => {
  const raw = {
    q: "نجف",
    min: "0100",
    max: "1500.50",
    page: "2",
    sale: "1",
    type: "linear",
  };
  const normalized = normalizeShopParams(raw);
  assert.deepEqual(parseShopQuery(normalized), parseShopQuery(raw));
  assert.deepEqual(normalizeShopParams(normalized), normalized);
});

test("unbounded and invented filters never enter the shared render cache", () => {
  for (const raw of [
    { q: "lamp" },
    { min: "0" },
    { max: "100" },
    { type: "invented" },
    { page: "999999999" },
    { type: "linear,cob" },
    { family: "indoor", type: "linear", page: "2" },
    { sale: "1", sort: "price-asc" },
    { family: "outdoor", type: "linear" },
    { brand: "balcom" },
  ]) {
    assert.equal(isCacheableShopQuery(parseShopQuery(raw)), false);
  }
  for (const raw of [
    {},
    { family: "indoor", type: "linear" },
    { family: "outdoor" },
  ]) {
    assert.equal(isCacheableShopQuery(parseShopQuery(raw)), true);
  }
});
