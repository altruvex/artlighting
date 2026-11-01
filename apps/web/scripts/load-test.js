// k6 load test for the storefront's read paths.
//
//   pnpm --filter web build
//   NEXT_COMPRESS=off pnpm --filter web exec next start -p 3100   (separate shell)
//   k6 run -e VUS=50 apps/web/scripts/load-test.js
//
// Every request here is a GET that writes nothing: the product page stopped
// creating a Configuration row per view (see lib/configuration.server.ts).
//
// It refuses any BASE other than localhost unless ALLOW_REMOTE=1: pointing
// it at the live site is a denial-of-service against it. Also check which
// database the local server reads — Next loads .env.local over .env, and
// the .env files in this repo point at production (ep-empty-fog); run with
// a .env.local on the Neon dev branch.
/* global __ENV */
import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:3100";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) && __ENV.ALLOW_REMOTE !== "1") {
  throw new Error(`Refusing to load-test ${BASE}. Set ALLOW_REMOTE=1 only for a staging deployment you own.`);
}

const pages = {
  home_en: "/en",
  home_ar: "/ar",
  shop: "/en/products",
  shop_family: "/ar/products?family=chandelier",
  shop_sort: "/en/products?sort=price-asc&page=2",
  product: __ENV.PRODUCT_PATH || "/en/category/mister-led/chandelier/mc15w/mc15w009",
  applications: "/en/applications",
  about: "/ar/about-us",
  privacy: "/en/privacy",
  faqs: "/ar/faqs",
};
const trends = Object.fromEntries(Object.keys(pages).map((name) => [name, new Trend(`t_${name}`, true)]));
const vus = Number(__ENV.VUS || 50);

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: vus },
        { duration: __ENV.HOLD || "40s", target: vus },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "max"],
};

export default function () {
  for (const [name, path] of Object.entries(pages)) {
    const response = http.get(BASE + path, { headers: { "Accept-Encoding": "gzip, br" }, tags: { page: name } });
    trends[name].add(response.timings.duration);
    check(response, { "status 200": (r) => r.status === 200 });
  }
}
