# Storefront hosting cost fix — 15 November 2026

## Result

The code fix is deployed to `artlighting-eg.com`: deployment `dpl_AwYMqB3gST9Jgm1shKcjJ5r2RUeJ`, commit `cae6deb1d9b446c2586578fcb437142eab09176b`. Firewall configuration v6 is active. [PR #18](https://github.com/altruvex/artlighting/pull/18) is ready for review, not merged into main. The deployed patch was based on the previous production revision b58d63c; unrelated local storefront/pricing work was excluded and preserved.

## Evidence

Vercel Firewall traffic for 14 November 03:00 UTC–15 November 04:00 UTC recorded about 135,334 allowed requests. Verified bot counts included 97,569 Googlebot, 27,545 SERankingBacklinksBot and 7,710 GoogleOther requests. The /en/products listing accounted for 100,358 requests; individual product pages were much smaller consumers. These counts describe requests, not human visitors. They do not support attributing the current incident mainly to AI crawlers.

The final measurement window, 15 November 07:55–08:30 UTC, recorded 1,348 denied requests, 25 allowed and 8 challenged. The filter rule matched 1,070 requests, the observed bulk crawler rule 277, and the updated AI listing rule one. This confirms enforcement; it is not a measured percentage reduction in the monthly bill.

The billing screen showed usage credit consumed of $19.48 out of $20 for the Nov 1–Dec 1 cycle, with an upcoming $20 Pro invoice. The $19.48 was not another bill on top of the subscription. Artlighting accounted for approximately $17.16 of team usage. The largest team usage items were origin transfer ($4.23), runtime cache reads ($3.74), active CPU ($3.71), and observability events ($2.76).

## Cause and changes

The shop exposes checkbox combinations, ordering, pagination, search and price parameters as links. Canonical metadata alone did not prevent bots from traversing those combinations. Equivalent filter selections could generate differently ordered URLs and cache keys. Dynamic shop requests still invoke server work even with cached catalogue data; PPR internal resume requests can appear as POST in function logs and are not alone evidence of malicious server actions.

Changes deployed:

- Robots permits only the finite shop, family and family/type landing shelves. The same list drives the sitemap. Other filter combinations remain usable by shoppers, receive noindex, and their shop links use nofollow.
- Equivalent queries and generated links normalize ordering, duplicate values, default values and tracking parameters. Filter links do not prefetch.
- Remote rendered-shelf caching is restricted to finite public landing shelves. Arbitrary searches, price ranges, multi-filters, sorting and pagination do not produce an unlimited set of remote rendered entries; they use the shared cached catalogue.
- Existing Upstash limiters now also protect search, recently viewed reads, configuration edits, cart reads/writes and order reads before expensive work. Authenticated cart/order limits use user IDs. Existing fail-open behavior when Redis is unavailable is preserved.
- User-approved firewall rules block SERanking and GoogleOther on products listings, stop bot requests to redundant filter combinations, and include the locale-less /products route in the existing AI crawler rule. No blanket storefront per-IP rate limit was activated. Product detail URLs and canonical category shelves remain available to Googlebot and Bingbot.

The new firewall rules are recorded in `ops/vercel-crawler-rules.json`. They are an operational record, not automatically installed by a code deployment. Match rules use user-agent strings, which can be spoofed; these measures reduce the observed abuse but do not guarantee a maximum future bill.

## Validation

- Six query/crawl regression tests passed, including all sitemap landing pages and duplicate/encoded filter combinations.
- TypeScript passed in the production-based worktree.
- ESLint had no errors; one pre-existing shop-filters effect warning remains.
- Full webpack production build passed locally; isolated Git build reached READY on Vercel. Both web and admin Vercel PR checks passed.
- English category and Arabic filtered listings returned 200 with expected index/noindex metadata and nofollow links; no streamed error markers.
- A real product returned 200. Anonymous cart GET returned 401. Sitemap XML parsed with 376 URLs.
- Promotion verified the public domain points to the new deployment and serves the updated robots file.
- The temporary deployment-preview credential created for testing was revoked afterward.

## Follow-through

Merge PR #18 into main before a future main-based deployment, so the source branch retains the live code fix. Local working-copy changes also contain the fix, alongside the user's earlier unrelated changes. Compare the same 24-hour window of route invocations, CPU, cache reads and origin transfer after deployment; historical accrued charges will remain. No recurring automation or spend-triggered shutdown was enabled.

The prior production deployment, available for code rollback, is `dpl_2Lnud3EuQLdWW5rRcga3gDmF4QC6`. Firewall configuration is separate from code deployment.

References: [Google guidance on faceted crawling](https://developers.google.com/crawling/docs/faceted-navigation), [Vercel firewall usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing).
