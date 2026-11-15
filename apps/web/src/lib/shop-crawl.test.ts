import assert from "node:assert/strict";
import { test } from "node:test";
import robots from "../app/robots";
import { SHOP_LANDING_PATHS, shopLinkRel } from "./shop-crawl";
import { setParam, toggleParam } from "./shop-url";

test("filter links are canonical regardless of selection order or tracking input", () => {
  assert.equal(toggleParam({ family: "indoor", utm_source: "ad" }, "brand", "balcom"),
    toggleParam({ brand: "balcom" }, "family", "indoor"));
  assert.equal(setParam({ family: "indoor,indoor", page: "9" }, "sort", "featured"), "/products?family=indoor");
});

test("only public landing shelves get followable links", () => {
  for (const path of SHOP_LANDING_PATHS) assert.equal(shopLinkRel(path), undefined);
  for (const path of ["/products?brand=balcom", "/products?family=indoor,outdoor", "/products?page=2", "/products?q=lamp"])
    assert.equal(shopLinkRel(path), "nofollow");
});

test("robots preserves every sitemap shelf while excluding filter permutations", () => {
  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  const general = rules.find((rule) => rule.userAgent === "*")!;
  const patterns = (value: string | string[] | undefined) => value ? [value].flat() : [];
  const matchLength = (pattern: string, url: string) => {
    const regex = pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${regex}`).test(url) ? pattern.length : -1;
  };
  const allowed = (url: string) => Math.max(...patterns(general.allow).map((p) => matchLength(p, url))) >=
    Math.max(...patterns(general.disallow).map((p) => matchLength(p, url)));
  for (const prefix of ["", "/en", "/ar"]) {
    for (const path of SHOP_LANDING_PATHS) assert.ok(allowed(prefix + path), prefix + path);
    for (const query of ["brand=balcom", "family=indoor,outdoor", "family=indoor%2Coutdoor", "family=indoor&type=linear&page=2", "family=indoor&family=outdoor", "q=lamp", "page=9999"])
      assert.equal(allowed(`${prefix}/products?${query}`), false, query);
  }
  assert.ok(allowed("/en/category/balcom/indoor/linear/example"));
});
