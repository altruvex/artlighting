import assert from "node:assert/strict";
import { test } from "node:test";
import { diverseProducts } from "./home-assortment";

const product = (
  id: string,
  sectionType: string,
  lightingTypeSlug: string,
) => ({ id, sectionType, lightingTypeSlug });

test("a large chandelier collection cannot hide indoor and outdoor lighting", () => {
  const catalogue = [
    ...Array.from({ length: 20 }, (_, i) =>
      product(`chandelier-${i}`, "CHANDELIER", "mc15"),
    ),
    product("spot", "INDOOR", "cob"),
    product("panel", "INDOOR", "panel-light"),
    product("garden", "OUTDOOR", "bollard"),
  ];
  const shelf = diverseProducts(catalogue, 6);
  assert.equal(shelf.length, 6);
  assert.deepEqual(
    new Set(shelf.slice(0, 3).map((item) => item.sectionType)),
    new Set(["CHANDELIER", "INDOOR", "OUTDOOR"]),
  );
  assert.ok(shelf.some((item) => item.id === "panel"));
  assert.equal(new Set(shelf.map((item) => item.id)).size, shelf.length);
});

test("a small catalogue stays truthful and preserves preference order within each type", () => {
  const catalogue = [
    product("available", "INDOOR", "cob"),
    product("quote-only", "INDOOR", "cob"),
  ];
  assert.deepEqual(diverseProducts(catalogue, 10), catalogue);
  assert.deepEqual(diverseProducts([], 10), []);
  assert.deepEqual(diverseProducts(catalogue, 0), []);
  assert.deepEqual(diverseProducts(catalogue, 1), [catalogue[0]]);
});
