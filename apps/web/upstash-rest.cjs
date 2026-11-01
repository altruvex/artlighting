/**
 * Where to reach Upstash over REST, for every Redis user in this app (the
 * shared cache handler, the rate limiter, next.config and the env check).
 *
 * REDIS_URL wins when it points at Upstash
 * (rediss://default:<password>@<db>.upstash.io:6379): the same database
 * serves REST at https://<db>.upstash.io and takes the password as the
 * bearer token. Otherwise the explicit UPSTASH_REDIS_REST_URL / _TOKEN pair.
 *
 * Plain CommonJS so cache-handler.cjs, which Next loads outside the bundle,
 * can require it too.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ url: string, token: string } | null}
 */
function upstashRest(env = process.env) {
  if (env.REDIS_URL) {
    try {
      const parsed = new URL(env.REDIS_URL);
      if (parsed.hostname.endsWith(".upstash.io") && parsed.password) {
        return { url: `https://${parsed.hostname}`, token: decodeURIComponent(parsed.password) };
      }
    } catch {
      // Not a URL: fall through to the explicit pair.
    }
  }
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  }
  return null;
}

module.exports = { upstashRest };
