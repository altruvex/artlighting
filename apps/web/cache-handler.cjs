// @ts-check
/**
 * The "use cache" handler for self-hosted, multi-instance deployments.
 *
 * Entries stay in memory, in Next's own default handler (fast, and proven):
 * each instance fills its own copy from the database at most once per cache
 * lifetime. What is shared is *invalidation*. Without this, the admin's
 * POST /api/revalidate reached one instance and every other one kept serving
 * the old prices for up to 5 minutes.
 *
 * How: a tag revalidated here is written to a Redis hash (tag → time and
 * expire). Every instance reads that hash at most once a second, in the
 * background, and replays any tag it has not seen into Next's process-wide
 * tags manifest — the same manifest the page cache checks, so prerendered
 * pages are dropped too, not only "use cache" entries.
 *
 * Talks to Upstash over its REST API with node:https — not fetch, which
 * Next patches: during a prerender an uncached fetch never resolves, and
 * the build hung on it. No client library either, so this file loads
 * before the app's bundles. Any Redis failure degrades to the
 * single-instance behaviour; it never fails a request.
 *
 * Wired in next.config.ts only when Upstash is configured (see upstash-rest.cjs) and
 * the app is not on Vercel, whose platform does this itself.
 */

const http = require("node:http");
const https = require("node:https");
const { createDefaultCacheHandler } = require("next/dist/server/lib/cache-handlers/default");
const { upstashRest } = require("./upstash-rest.cjs");

const rest = upstashRest();
const REDIS_URL = rest?.url;
const REDIS_TOKEN = rest?.token;
const TAGS_KEY = process.env.CACHE_TAGS_REDIS_KEY || "next:cache:tag-events";
/** How stale another instance's invalidation may be before we notice it. */
const SYNC_INTERVAL_MS = 1_000;
const REDIS_TIMEOUT_MS = 2_000;
/** Events older than every cache lifetime can be forgotten. */
const EVENT_TTL_SECONDS = 60 * 60 * 24 * 7;

const inner = createDefaultCacheHandler(50 * 1024 * 1024);

/** tag → the newest event time (ms) this process has applied. */
const applied = new Map();
let lastSync = 0;
/** @type {Promise<void> | null} */
let syncing = null;
let loggedFailure = false;
let started = false;

/**
 * POST to Upstash's /pipeline endpoint.
 * @param {string} body
 * @returns {Promise<string>}
 */
function post(body) {
  return new Promise((resolve, reject) => {
    const url = new URL("/pipeline", REDIS_URL);
    // http only for a local stand-in; Upstash itself is https.
    const request = (url.protocol === "http:" ? http : https).request(
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
        timeout: REDIS_TIMEOUT_MS,
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () =>
          response.statusCode === 200 ? resolve(data) : reject(new Error(`Upstash answered ${response.statusCode}`)),
        );
      },
    );
    request.on("timeout", () => request.destroy(new Error("Upstash timed out")));
    request.on("error", reject);
    request.end(body);
  });
}

/** @param {unknown[][]} commands */
async function redis(commands) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const results = /** @type {{ result?: unknown, error?: string }[]} */ (JSON.parse(await post(JSON.stringify(commands))));
    loggedFailure = false;
    return results;
  } catch (error) {
    if (!loggedFailure) {
      loggedFailure = true;
      console.error("[cache-handler] Shared tag sync unavailable; invalidations stay on this instance:", error);
    }
    return null;
  }
}

/** Replays every tag event another instance published since we last looked. */
async function sync() {
  const results = await redis([["HGETALL", TAGS_KEY]]);
  const flat = results?.[0]?.result;
  if (!Array.isArray(flat)) return;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const tag = String(flat[i]);
    const [at, expire] = String(flat[i + 1]).split(":");
    const time = Number(at);
    if (!Number.isFinite(time) || time <= (applied.get(tag) ?? 0)) continue;
    applied.set(tag, time);
    const seconds = expire === "" || expire === undefined ? undefined : Number(expire);
    await inner.updateTags([tag], seconds === undefined || !Number.isFinite(seconds) ? undefined : { expire: seconds });
  }
}

/** @type {import("next/dist/server/lib/cache-handlers/types").CacheHandler} */
const handler = {
  get: (cacheKey, softTags) => inner.get(cacheKey, softTags),
  set: (cacheKey, pendingEntry) => inner.set(cacheKey, pendingEntry),
  getExpiration: (tags) => inner.getExpiration(tags),

  async refreshTags() {
    // Never on the request's critical path: kick a sync off at most once a
    // second and let this request use what is already known. The first one
    // after boot is awaited, so a fresh instance starts from the shared state.
    const now = Date.now();
    if (now - lastSync < SYNC_INTERVAL_MS || syncing) return;
    lastSync = now;
    syncing = sync().finally(() => {
      syncing = null;
    });
    if (!started) {
      started = true;
      await syncing;
    }
  },

  async updateTags(tags, durations) {
    await inner.updateTags(tags, durations);
    const time = Date.now();
    const value = `${time}:${durations?.expire ?? ""}`;
    for (const tag of tags) applied.set(tag, time);
    await redis([
      ["HSET", TAGS_KEY, ...tags.flatMap((tag) => [tag, value])],
      ["EXPIRE", TAGS_KEY, EVENT_TTL_SECONDS],
    ]);
  },
};

module.exports = handler;
