# ArtLighting: Admin → ERP-level e-commerce upgrade plan

Status: **APPROVED 2026-09-19** (scope update: English-only generated output, D11). Hotfix, Phase 0, the ERP redesign and Phase 1 done (all on the Neon `dev` branch). Phase 2 next.
Written 2026-09-19 after reading the monorepo and the Altruvex admin (`/Users/ali/altruvex`, read-only).

---

## 0. Decisions (approved 2026-09-19)

| # | Decision | Chosen |
|---|---|---|
| D1 | Uncommitted datasheet work | **Commit as-is** on the current branch (`main`) as the baseline. **No new branch.** Rollback point: tag `pre-erp-upgrade` (= `eb9a21c`, local tag). |
| D2 | Identity model | **Keep two Better Auth pools**: `admins` (ADMIN/STAFF) and `users` (CUSTOMER). |
| D3 | Money `Float` → `Decimal(12,2)` | **Yes.** The pre-check query and its result are shown before migrating. |
| D4 | Order header + item snapshots | **Yes, one clean migration.** There are 0 orders in production, so legacy columns are dropped outright: no nullable legacy columns and no backfill. The SQL is shown before applying. |
| D5 | `OrderStatus` changes | **Rename in place, one clean migration** (0 orders). The exact SQL is shown before applying. |
| D6 | Generated-file storage | **Cloudinary raw, private + signed delivery.** At the **start of Phase 4**, verify that the Cloudinary plan allows PDF/ZIP delivery (restricted by default on free plans: *Settings → Security → "Allow delivery of PDF and ZIP files"*) and tell Ali exactly what to enable. |
| D7 | Rendering runtime | **Separate Docker worker.** Hosting is **undecided**: it must run locally with Docker for development, as a plain host-agnostic Dockerfile configured only through env vars. **Bulk jobs must survive a restart or fail clearly and be retryable** (see Phase 4, task 2). |
| D8 | Admin i18n (ar/en, all existing strings) | **Yes**, in **its own commit(s)**, separate from the dependency upgrades. The whole UI (storefront and admin) is ar/en. |
| D9 | `Customer` profile with optional `userId` | **Yes.** |
| D10 | Payments | **Cash on delivery only.** No gateway for now. |
| D12 | Document export formats (2026-09-19) | **Every generated document offers both PowerPoint (.pptx) and PDF downloads**: quotations, datasheets, catalogues and invoices. Quotations also export to Excel (.xlsx). The pipeline builds the PPTX first and converts it to PDF, so both come from the same render and always match. Both files are stored as `GeneratedFile` rows. |
| D11 | Generated output language (scope change, 2026-09-19) | **English only** for every generated artifact: quotation, datasheet, catalogue and invoice PDFs and Excel files, and **all emails** (one English template each, no per-customer locale). Documents use the **English** translation of product names, descriptions and specs. This overrides the brief's requirement for Arabic documents and localized emails. The UI stays ar/en (storefront **and** admin). |

### Migration approval rule (agreed 2026-09-20)
- **Dev (Neon `dev` branch):** show the SQL and apply in the same turn.
- **Production:** show the SQL and **stop** until Ali explicitly approves. Production then receives exactly the committed migration folders through `prisma migrate deploy` — never `db execute`, never `db push`.
- Every migration lives as a folder in `packages/database/prisma/migrations` (with `migration_lock.toml`), and `migrate diff --from-migrations … --to-schema` must be empty before a phase closes.

### Order of work
1. **Hotfix (before Phase 0), done: `ac174d7`.** `completeOrder` is scoped to the order owner, and BETTER_AUTH_SECRET is enforced in production (≥ 32 chars). It is a separate commit directly on top of `pre-erp-upgrade`, so it can be deployed alone.
2. Phase 0, with **Prisma 6 → 7 last, in its own commit**, only after everything else builds and typechecks.
3. Phases 1–7 in order, one phase at a time.
4. Commits stay small, one per logical step (everything is on `main`).

### Read-only DB check (2026-09-19)
Run against the Neon endpoint in `packages/database/.env` (`ep-empty-fog-…-pooler`, eu-central-1) in a `default_transaction_read_only` session:
- `users`: **0**; `accounts`: 0; customer sessions: 0; `orders`: **0**
- `admins`: **1** (role `owner`, has a password)
- The local `.backups/pre-migration-backup-*.json` also has 0 users and 0 orders (117 products).

**Confirmed by Ali: ep-empty-fog is production.** **Consequence:** there are no customer passwords or sessions to migrate (the Phase 1 user migration is a no-op), and the D3/D4/D5 migrations touch no customer or order rows. The SQL is still shown before applying, as agreed.

### Development database (Neon branch), set up before any schema migration
Today all three `.env` files point at **production**. Before the first schema migration:
1. In the Neon console, go to project → **Branches** → **Create branch**:
   - name: `dev`
   - parent: the production branch (`main`/`production`)
   - include data up to: **Current point in time**, so the real products, categories and images are copied
   - a read-write compute is enough (autoscaling min 0.25 CU, scale-to-zero on)
2. In the `dev` branch go to **Connect**. Copy **two** connection strings for the same role and database: one with **Connection pooling on** (host contains `-pooler`) and one with it **off** (direct).
3. Local env, all three files (`packages/database/.env`, `apps/web/.env`, `apps/admin/.env`):
   - `DATABASE_URL` = dev **pooled** URL
   - `DIRECT_URL` = dev **direct** URL (new; migrations use it)
   - Keep the production URLs **out of local files**. Production values live only on the host.
4. Rules from then on:
   - Every `prisma migrate dev` runs against `dev`.
   - Production only gets `prisma migrate deploy` after Ali approves, run by Ali or by me with a production `DIRECT_URL` supplied just for that step.
   - Before any production migration, the `dev` branch is reset from its parent and the migration replayed, so it is tested on current production data.



### Phase 0 outcome (2026-09-19)
Commits on `main` (not pushed): datasheet baseline → lint restored (ESLint 10) → shared tsconfig + `check-types` everywhere → dependency upgrades → dead code → env contracts → **security fix (admin auth gaps)** → admin i18n → admin bug fixes → Prisma 7.

Found and fixed along the way (beyond the plan):
- **Security `82dab5a`:** `orders/[orderId]` and `users/[userId]` admin pages and the `changeOrderStatus` server action had **no auth check at all**. Order ids are sequential, so every order's customer name, phone and address was readable by anyone, and any order's status was changeable. Fixed; cherry-picks cleanly onto the deployed version. Customer PII was also being logged on every request.
- Admin Better Auth `baseURL` fell back to the storefront's URL.
- `pnpm.overrides` for `minimatch` / `ajv` broke ESLint; replaced with per-major patched pins.
- Two destructive scripts (`db:reset` = `migrate reset --force`, `db:push`) were one keystroke away while every `.env` points at production; removed.
- Avatars sent customer emails to dicebear.com; now rendered locally.
- **Upstash is gone:** the host in the local `.env` (`ultimate-fish-7999.upstash.io`) no longer resolves. The cache falls back to Postgres and the rate limiter fails open, so the storefront works, but **there is no rate limiting**. Needs a new Upstash database (or removal in Phase 6).
- Better Auth 1.7 wants 6 new indexes (sessions/accounts `userId`, verifications `identifier`, and the admin equivalents). They're additive and go into the first Phase 1 migration, on the Neon `dev` branch.
- `pnpm audit`: 101 advisories → 3. Remaining: `image-size` via pptxgenjs (no patch exists; only parses our own images) and `deepmerge-ts` via Prisma's CLI config (dev-time only).

### ERP redesign + dev-branch QA (2026-09-20)
Scope change requested after Phase 0: rebuild the admin as an ERP UI. Done in 12 commits after `phase-0-complete`, all local.
- Shell: grouped sidebar (icon rail / mobile drawer), top bar with breadcrumbs and ⌘K palette, user menu, skip link. Shared kit: PageHeader/PageShell, StatCard, StatusBadge, EmptyState, DataTable (client mode) and **ServerDataTable** (pagination, sorting, search and facets executed in Postgres, state in the URL, allow-list validated). Orders and customers use the server mode; products stays client-side.
- Every screen moved onto the kit, plus loading skeletons. Glassmorphism dropped for opaque surfaces. `framer-motion`, `date-fns`, `embla` and 8 dead components/primitives removed.
- Tokens: semantic success/warning/info, a dedicated `--danger` text tone (destructive-as-text failed AA at 3.84:1), and a darker light-mode focus ring (was 1.57:1, now 3.67:1). All measured in-browser.

**Verified on the Neon `dev` branch** (`ep-rough-hall`, seeded with 2 customers and 34 orders via `pnpm --filter @repo/database seed:dev`): create product, price change + price history, image upload to Cloudinary, image delete (row + asset gone), order status change, bulk datasheet job (12 products → 7.6 MB ZIP), single datasheet as **both PPTX and PDF**, soft delete + restore. Screens walked in ar/en at 375px and desktop: no horizontal overflow, one `h1` and one `main` per page, RTL correct.

Fixed during QA: no feedback on order status change; deleted images kept serving from the Cloudinary CDN; nested `<main>` landmarks; category names untranslated in the categories manager.

Nothing has been pushed. Production is untouched: `.env.local` points at `dev`, and write scripts refuse a production host (`assertNotProduction`).

### Phase 1 outcome (2026-09-20)
All on the Neon `dev` branch; production untouched.

Two migrations, SQL reviewed before applying:
- `20260920090000_phase1_roles_and_auth_indexes`: AdminRole `owner→ADMIN`, `staff→STAFF` as an in-place `RENAME VALUE` (Prisma's generated recreate-and-cast would have failed on every existing row), `users.role` (UserRole CUSTOMER), dropped the unused `users.configurationId` / `users.productId`, and the six indexes Better Auth 1.7 expects.
- `20260920100000_configuration_owner`: `configurations.userId` (nullable, indexed, SET NULL).

Authorization: a permission table (`apps/admin/lib/permissions.ts`) replaces scattered role checks — STAFF works the catalog, orders and datasheets; ADMIN adds price, discount, staff and settings. `proxy.ts` denies by default with an explicit allow-list, and `scripts/check-action-guards.mjs` (in `check-types`) fails when an action or route handler has no guard.

Storefront security, tested for real on dev with the two seeded customers signed in: reading, completing, updating or pricing another customer's record answers **404 — identical to a record that doesn't exist**; invalid cart quantities answer 400; anonymous configuration writes answer 401.
- `POST /api/configurations/[configId]` needed **no session at all** before.
- `/api/pricing/validate` checked ownership via `Configuration.users`, fed by `User.configurationId`, which was never written for any user — so it rejected **everyone**; the endpoint was dead.
- Configuration lookups returned the newest row for a product regardless of owner, so two customers shared one configuration.
- `GET /api/orders/[orderId]` leaked internals in a 500; now 404.

Server actions return errors instead of throwing (a production build strips thrown messages), verified in a production build in both locales. Storefront API routes moved out of `[locale]/api` with redirects. Email verification and password reset are wired to one delivery seam that Phase 5 points at Resend.

### Phase 2 progress (2026-09-20)
On the Neon `dev` branch; production untouched.

**D3 applied (`20260920140000_money_and_rates_to_decimal`).** 22 columns left
`double precision`: money → `DECIMAL(12,2)`, discount rates → `DECIMAL(5,4)`
(0.1300 = 13%), `currency_rates.rate` → `DECIMAL(18,8)`. The pre-check ran
before the SQL was written and found **0 lossy values** — every existing
value fits its target scale, so each cast is exact. `discounts.value` stays
money-scaled because it holds either an amount or a whole percentage.

**`@repo/money`** (decimal.js, ROUND_HALF_UP) is the only place money
arithmetic happens: 18 unit tests cover 0.1 + 0.2, ten × 0.1, 1.005 rounding,
half-up on negatives, a 13% line, 14% VAT, a full subtotal/discount/shipping
total, the string round-trip and both locales' formatting.

**Boundary rule.** `Prisma.Decimal` cannot cross Server → Client, and
`Number()` discards the exactness the columns exist for. Money is therefore
serialized to a fixed-scale **string** at the boundary
(`serializeRowMoney` / `toViewConfiguration` in
`apps/web/src/lib/serialize-money.ts`, mirrored in the admin) and formatted
from the string. **A view model's money field is typed `string`, never
`MoneyInput`** — `MoneyInput` accepts a Decimal, so typing view models with
it let unserialized rows compile and fail at runtime instead.

Three real pricing bugs were fixed on the way:
- the cart computed `price * qty * (1 - discount / 100)` while `discount` is
  already a rate, i.e. it applied **0.13%** instead of 13%;
- several components guessed with `discount > 1 ? discount / 100 : discount`,
  which turns a 1.5% rate into **150%**;
- `product.updatePrice` compared Decimals with `!==`, which compares object
  identity, so it would have written a PriceHistory row on every save.

`guestToken` was being sent to the browser inside the preview page payload,
defeating the httpOnly cookie it lives in; `toViewConfiguration` drops it.

**SKU pre-check (read-only, before designing the Excel import).** 118
products, 118 variants, and:
- no duplicate `Product.productId` (case-insensitive), no whitespace, no
  non-ASCII, all lowercase;
- no duplicate `ProductVariant.sku`, and no variant SKU colliding with a
  different product's `productId`;
- every product has exactly one default variant — the catalogue is 1:1
  today, so the stock sync starts trivial.

So **the Excel import can match on `productId` (= SKU) directly**, with a
case-insensitive lookup and no disambiguation step.

### Phase 2 outcome (2026-09-20)
All on the Neon `dev` branch; production untouched; nothing pushed.

**Two migrations**, SQL shown before applying:
- `20260920140000_money_and_rates_to_decimal` — D3, above.
- `20260920160000_catalog_pricing_status_and_spec_groups` — §3.3, entirely
  additive. compareAtPrice/cost on product and variant, `ProductVariant.price`
  (replacing priceOverride), `Product.status` (DRAFT|ACTIVE|ARCHIVED) and
  `lowStockThreshold`, ProductImage width/height/format/bytes, and
  SpecGroup/SpecItem with per-language translations. The status derivation runs
  **inside** the migration, not as a separate backfill, so no row is ever
  briefly wrong — verified: 117 ACTIVE, 1 ARCHIVED, 0 disagreements.

**`@repo/catalog`** is now the one product domain service: zod validation over
strings, price changes through the audited path, bulk pricing, the Excel
round-trip, and the stock sync **inside the caller's transaction**. Stock's
source of truth is the default variant; `Product.quantity` is a mirror kept in
step there rather than in whichever action remembered to.

**Three backfills**, each idempotent, dry-run-first, production-guarded, and
refusing to run with no flag at all: `backfill:stock`, `backfill:images`
(deterministic `products/<sku>/<order>` public_ids), `backfill:specs` (403
groups, 1,311 items on dev; a second run produces identical counts).

**Signed direct Cloudinary uploads** replace base64-through-a-Server-Action.
Only the `public_id` returns; the server re-reads the asset from Cloudinary,
so a forged URL cannot reach a product page.

**The storefront reads `ProductImage` and variant stock**, not
`productImages[]`/`quantity`. Both sources hold the same URLs today, so this
changed nothing visible — proved by flipping `isPrimary` on dev and watching
the render order follow.

**Admin UI**: bulk price editing (in the table's existing selection bar) and
Excel import/export with a dry-run preview. Neither writes on one click.

#### Bugs found and fixed on the way
| bug | consequence |
|---|---|
| cart computed `price * qty * (1 - discount / 100)` on a rate | charged **0.13%** instead of 13% |
| several components guessed `discount > 1 ? d / 100 : d` | a 1.5% rate became **150%** |
| `product.updatePrice` compared Decimals with `!==` | compares identity, so a PriceHistory row on every save |
| view models typed money as `MoneyInput` | `MoneyInput` accepts a Decimal, so unserialized rows compiled and failed at runtime; the Arabic product page never finished rendering |
| `guestToken` in the preview page payload | the httpOnly cookie was being handed to page scripts anyway |
| `applyBulkPrice` dropped ids with no product | a selection of ten could price eight and report success |
| `runInTransaction` probed with `"$transaction" in db` | the client is a Proxy with only a `get` trap, so every write ran unwrapped |
| `parseInt` on Arabic-Indic spec values | every Arabic product page read "بقدرة NaN وات" |

#### Still open, needing Ali
- **The image backfill has not been applied.** Its apply path writes 174 assets
  to the one shared Cloudinary account whichever database is pointed at. It was
  verified end-to-end on dev under a `dev/` prefix and those test assets
  destroyed. Say the word and it runs for real.
- **`mc1608-w1`** has a `ProductImage` row whose file is missing from
  `apps/web/public`; the dry run reports it rather than failing.
- **Arabic/English spec mismatch** predating this work: `jy-202-15w` reads
  "٦٢٠ لومن/متر" in Arabic and "1320LM (3000k) / 1400LM (6500k)" in English.
  Data, not code — not mine to guess at.
- **The admin screens have not been looked at signed in.** Contrast and RTL
  were measured statically; the flows need a session.

### Phase 2 follow-up (2026-09-20): specs become data

Ali: *"معنديش مشكله لو هتغير في شكل الداتا وتقسيمها… نقسمه كل قيمه لوحدها
في متغيرات جديده… ويكون لينا access علي كل شئ"* — so the four open items
were closed by splitting the spec values rather than patching around them.

**Two more migrations**, both additive:
- `20260920180000_structured_spec_values` — `SpecValueKind`
  (MEASUREMENT | RANGE | CHOICE | TEXT), `SpecComparator`,
  `SpecMeasurement` (value, valueMax, and the condition a figure was taken
  at), and `SpecOption`/`SpecOptionTranslation`: a shared vocabulary so a
  material is defined once and translated once rather than retyped on 117
  products.
- `20260920190000_spec_item_key` — `SpecItem.key`, the language-neutral
  name of a spec, so a reader can ask for `ip` instead of for whatever the
  label reads in its locale.

All 1,311 values parsed; none stayed TEXT. The parser refuses to guess:
anything it cannot read confidently stays TEXT and is reported.

#### What the split found
| bug | scale | why it was invisible |
|---|---|---|
| 13 products: English "balcom **internal** Driver", Arabic درايفر **خارجي** (external) | 13 rows | two free-text strings for one fact |
| `jy-595-44w`: `"درايفر خارجي من Phillدرجة الحمايةs"` — a find-and-replace of "ip" → "درجة الحماية" ate the middle of "Phillips" | 1 row | nothing compared the two languages |
| 61 products: the energy-saving value repeated its own label | 61 rows | same |
| Arabic features text: six sentences with holes ("بنسبة تصل إلى  مقارنة") | every Arabic product page | lookup by **English label** against an Arabic-keyed map |
| an IP44 fixture called itself indoor-only in Arabic | every Arabic product page | `parseInt(undefined)` is NaN, and `NaN >= 44` is false |
| the whole colour-temperature section never rendered in Arabic | every Arabic product page | `includes("3000K")` against a value reading "٣٠٠٠ K" |

Each of the first three is now a one-row fix in the shared vocabulary
instead of 13, 1 and 61 rows, and they were corrected **at the source** so
re-running the backfill cannot bring them back.

#### Also closed
- **Image backfill applied.** 174 of 175 images on Cloudinary under
  `products/<sku>/<order>`, every row with real dimensions; the asset
  serves 200 at the exact byte count and the storefront picked them up
  with no code change.
- **`mc1608-w1`** is an active product whose file was never shipped. Images
  now fall back to `/placeholder.svg`, so it degrades instead of rendering
  broken — **it still needs its real photo**.
- **Upstash circuit breaker.** Each cache miss was waiting on its own
  failed DNS lookup: a product page took ~19s instead of 0.85s. The cache
  now steps aside after three failures and probes every 30s.

#### Still needs Ali
- **A photo for `mc1608-w1`.**
- **The admin screens have not been walked signed in.** Entering a password
  is not something I will do; contrast and RTL are measured statically, but
  the bulk-price and import flows need a session.

## Production rollout runbook

Nothing below has run against production. Production receives exactly the
committed migration folders, through `prisma migrate deploy` — never
`db execute`, never `db push`. Ali passes the production URL for that one
command; the production-host guard in the scripts stays regardless of what
the local `.env` files contain.

### Order (must not be reordered)
| # | Step | Kind | Notes |
|---|------|------|-------|
| 1 | Back up / branch production in Neon | manual | The rollback point. The `pre-erp-upgrade` tag (`eb9a21c`) is the code rollback point. |
| 2 | `20260920090000_phase1_roles_and_auth_indexes` | migration | Renames enum values in place. Deploy the app **after** this, since the code expects `ADMIN`/`STAFF`. |
| 3 | `20260920100000_configuration_owner` | migration | Additive. |
| 4 | `20260920120000_configuration_guest_token` | migration | Additive. |
| 5 | `20260920140000_money_and_rates_to_decimal` | migration | **Re-run the pre-check against production first** and show the result; the dev pre-check does not prove anything about production rows. |
| 6 | Deploy web + admin | deploy | Both apps must ship together with step 5: the old code reads these columns as floats. |
| 7 | Backfills | script | Each is idempotent, re-runnable, has `--dry-run`, and refuses to run against the production host without `ALLOW_PRODUCTION_WRITES=1`. Run `--dry-run` first and show the diff. |

### Backfills (Phase 2, each its own script and commit)
| Script | Idempotency key | Dry run shows |
|--------|-----------------|---------------|
| spec groups | `(productId, group position, language)` | rows to create per product |
| `/public` images → Cloudinary | deterministic `public_id` = `artlighting/products/<productId>/<n>`, so a re-run overwrites rather than duplicating | files to upload, and which `ProductImage` rows would be written |
| stock sync | `ProductVariant.stock` is the source of truth; `Product.quantity` follows | products whose `quantity` disagrees with their default variant |

Legacy `/public` files and the old columns (`Product.productImages[]`,
`Product.quantity`, `Product.discount`) stay until Ali confirms; dropping
them is a **separate migration**, later.

### Environment variables to set before the production deploy
Collected in §5; the ones Phase 2 adds are listed there as they land.

## 1. Findings

### 1.1 Monorepo layout (pnpm 10.28 + Turbo 2.10.9)

| Path | What it is |
|---|---|
| `apps/web` | Storefront. Next **16.0.10**, React 19.2.3, next-intl 4.8.3, Better Auth 1.6, Tailwind 4, shadcn. Upstash Redis cache. Port 3000. |
| `apps/admin` | Admin. Next **16.1.5**, React 19.2.3, Better Auth 1.6, shadcn, Tailwind 4, react-hook-form. **No i18n.** Port 3001. |
| `apps/datasheet-worker` | *(uncommitted)* Express 4 + tsx. `/convert` (PPTX→PDF via LibreOffice) and `/jobs` (bulk datasheets, in-memory job store, zip). Dockerfile on node:22-bookworm-slim. |
| `packages/database` | Prisma **6.19** (`prisma-client-js`), a `globalThis` singleton, and a `$extends` `product.updatePrice` that writes `PriceHistory`. 5 migrations. |
| `packages/datasheet` | *(uncommitted)* pptxgenjs 3.12 slide builder (A4, cover, tokens taken from the reference PPTX). Database-agnostic. |
| `packages/datasheet-data` | *(uncommitted)* Prisma → `DatasheetProductData`, images fetched from the storefront URL. |
| `packages/eslint-config`, `packages/typescript-config` | Flat ESLint config and tsconfig bases. **Nothing uses either.** |

### 1.2 Current state vs. the brief (a lot is already partly done)

| Area | Where it stands |
|---|---|
| Better Auth | **Already migrated from Clerk** (migration `20260808180000_replace_clerk_with_better_auth`). Admin uses separate tables (`admins`, `admin_sessions`, …) with roles `owner` / `staff`. Web uses `users`, `sessions`, `accounts`, `verifications`. Clerk is left only in `turbo.json`, in `apps/web/.env`, in comments, and in the catch-all folder names `sign-in/[[...sign-in]]`. |
| Admin route protection | Done per page and per action (`requireAdmin`, `requireOwner`). **There is no admin `proxy.ts`**, so a new page that forgets the check is public. |
| Product CRUD | Exists: create, general update, translations, specifications, price with history, soft delete/restore, duplicate, images. |
| Categories | Two-level hierarchy with translations, plus a `ProductCategory` many-to-many table. |
| Variants | `ProductVariant` exists (sku, stock, priceOverride). One default variant per product. `Product.quantity` still exists alongside it, so there are **two sources of truth for stock**. |
| Images | `ProductImage` (url, providerId, order, isPrimary). Cloudinary upload goes through a server action as a **base64 data URI**, which hits the Server Action body limit on large photos. The brief asks for signed direct uploads. Web still reads the legacy `Product.productImages String[]`, and most of those are relative `/public` paths. |
| Specifications | `ProductSpecification` has **fixed columns** (input, cri, beamAngle, …) plus `customSpecs Json`, one row per language. It is not grouped. |
| Discounts | `Discount` has type (percentage/fixed), scope (product/category/global), an optional `code` and a date window. It has **no** minimum order, usage limits, per-customer limit, stacking, multi-product scope or redemption tracking. `Product.discount` (a float) is a second, older discount mechanism. |
| Orders | Mixed model (see D4). Enum values differ from the brief. No invoice. |
| Quotations / catalogue | None. |
| Email | None. |
| Settings | Generic `SystemSetting` key/value and `CurrencyRate`. No company profile. |
| Audit | `PriceHistory` only. |

### 1.3 Web app data and caching
- Prisma is called directly from server actions, route handlers and `lib/services/*`, with **Upstash Redis** caching (`CacheService`, about 32 call sites).
- Nothing uses Next's cache tags (`'use cache'`, `cacheTag`, `revalidateTag`). **Admin mutations never invalidate the storefront**, so Redis keeps serving stale data until its TTL expires.
- Product pages set `dynamic = "force-dynamic"`, and one of them also defines `generateStaticParams`. The two contradict each other.
- API routes live under `[locale]/api/*`, which is unusual and doubles the URL space.
- There are two conflicting i18n configs: `src/i18n/routing.ts` (default `en`) and `src/lib/i18n/config.ts` (default `ar`).
- RTL is handled correctly: `dir` is set on `<html>`, with Almarai for Arabic and Roboto for Latin.
- Missing: an account page, order history, a real product search (it is `contains` with `take: 10`), filters, payment, quotation requests and datasheet download.

### 1.4 Tooling health
- `lint` in both apps is `next lint`, **which was removed in Next 16**, so lint currently does nothing. Running `eslint` directly **crashes before linting anything**: the root `pnpm.overrides` `minimatch >=10.2.1` breaks `@eslint/eslintrc`, which default-imports minimatch 3. Phase 0 scopes that override so it no longer hits eslint's dependencies.
- `eslint-config-next` 15.4 is installed with Next 16.
- Both apps have a legacy `.eslintrc.json` next to `eslint.config.mjs`, and `rules-of-hooks` is disabled.
- There is no `check-types` in web, admin or database. The root `type-check` script points at nothing.
- `apps/web/tsconfig.json` maps `@repo/database` to `packages/database/src`, **which does not exist**, and it includes three missing files.
- `next.config.ts` sets `compiler.styledComponents`, but styled-components is not installed.
- Unused dependencies: `next-cloudinary` (both apps), `next-config` (both), `dotenv-flow` (web).
- `db:seed` points to a missing `seed.ts`, and `import:products` points to a missing, gitignored script.
- **There is no `.env.example` anywhere.** `turbo.json` `build.env` lists the Clerk variables and is missing `BETTER_AUTH_*`, `CLOUD_*`, `UPSTASH_*` and `DATASHEET_*`, so Turbo's cache keys are wrong.
- The Neon datasource has only `url`: no `directUrl`, no driver adapter, no `prisma.config.ts`.
- The README is the stock Turborepo starter.

### 1.5 Security findings to fix early (Phase 1)
1. **`POST [locale]/api/webhooks/completeOrder`**: any signed-in customer can mark **any** order completed. It checks that a session exists, not who owns the order, and there is no payment verification.
2. The admin has no `proxy.ts` fallback guard (see 1.2).
3. `apps/web/.env` has no `BETTER_AUTH_SECRET`. In production Better Auth would fail or fall back to an insecure default.
4. Error responses return `details: error.message` to the client. *(Fixed for completeOrder in the hotfix; the rest are handled in Phase 1.)*
5. `POST [locale]/api/configurations/[configId]` has **no authentication at all**: anyone can change any configuration's quantity/price fields. Fixed in Phase 1 (configurations get an owner or become per-session).
6. `PUT /api/cart` doesn't validate `quantity` (it can be zero or negative). Fixed in Phase 1.

### 1.6 Altruvex reference: how it generates documents

| Aspect | What Altruvex does | What we do here |
|---|---|---|
| Layout engine | **pptxgenjs 4** builds A4-portrait slides with geometry measured from a reference deck (`apps/admin/lib/proposal-builder.ts`). | Same. `packages/datasheet` already follows this pattern. Upgrade pptxgenjs 3.12 → 4.0.1. |
| PDF | `soffice --headless --convert-to pdf` with its own profile per call and a 60 s timeout (`lib/pptx-to-pdf.ts`). | Same, inside the Docker worker (D7). |
| Preview | LibreOffice → PDF → `pdftoppm` PNG (`lib/pptx-to-images.ts`). | Same, for the quotation editor preview. |
| Word | `docx` for contracts. | Not needed. |
| Excel | **None.** | **New:** `exceljs` 4.4, covered in 1.7. |
| Arabic / RTL | **None.** Fonts are plain names (Georgia, Trebuchet MS), with no `rtlMode`. | Not needed: generated output is English only (D11). One Arabic-capable fallback font is installed (§1.7). |
| Content model | Zod-validated `content Json` is the frozen document, and the derived totals are written once at creation. Company settings are read live, but the rendered file is stored, so it never changes. | Same snapshot idea, extended (§3.6): the snapshot also includes company/branding, and the document can be edited while it is a draft. |
| Branding | `CompanySettings` singleton row (brand colours, contact). No logo. | `CompanySettings` with a logo (Cloudinary). |
| Numbering | UUID only. | **New:** a sequence per document type (`Q-2026-0001`). |
| Status | Manual transitions; ACCEPTED is locked once a contract exists. | Same idea, plus automatic expiry. |
| Email | Resend via raw HTTP, SMTP fallback. Sends a link, not an attachment. | **Resend SDK + React Email** as you asked, **English only** (D11). Sends a link, and optionally the PDF as an attachment. |
| Storage | R2 via S3, private presigned URLs, local fallback. | See D6. |

### 1.7 Generated documents: English only (D11)

- **PPTX + PDF (D12):** every document (quotation, datasheet, catalogue, invoice) is built as a **PowerPoint (.pptx)** with pptxgenjs and offered for download as-is **and** converted to **PDF** by LibreOffice in the Docker worker, the same pipeline Altruvex uses. **No Chromium and no dual-render spike.** Because the PPTX is editable, templates use real text boxes and tables, not flattened images.
- **Excel:** exceljs, a left-to-right sheet and Latin fonts (Arial).
- **Content:** product name, description and specs always come from the **English** translation (`language = "en"`). If a product has no English text, the document editor shows a warning and the line can still be edited for that document.
- **One Arabic-capable fallback font** in the worker image, only so that free text typed in Arabic (a customer name or address) never renders as empty boxes. It is **Noto Naskh Arabic** (OFL; `fonts-noto-core` covers it, or the TTF is copied from the repo). LibreOffice falls back to it per glyph through fontconfig.
  - No `rtlMode`, no mirrored layouts. A short Arabic string inside an English document will render correctly shaped, but it is not laid out right-to-left.
  - `/health` lists the required fonts (`fc-list`), so a missing font fails loudly instead of substituting silently.
  - In Excel, Arabic cell values display using the viewer's system fonts.
- **Pagination:** pptxgenjs has no automatic page flow. Long quotation and catalogue tables are split with the measuring helper `packages/datasheet/sections/_measure.ts`, with header/footer repeated on each page.

---

## 2. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Prisma 6 → 7: new `prisma-client` generator (ESM output path), mandatory `prisma.config.ts`, and driver adapters | Every import of `@repo/database` | Done in Phase 0, alone, with `check-types` across the repo before anything else changes. |
| npm's `latest` tag for `prisma` points at **8.0.0-rc.15** (a pre-release) | Accidentally installing an RC | Pin to **7.10.0** (last stable, the same one Altruvex runs). |
| TypeScript 7.0 (Go port) is `latest`, but typescript-eslint 8.70 supports `<6.1` | Lint breaks | Pin **TypeScript 6.0.3**. Revisit TS 7 when typescript-eslint supports it. |
| ESLint 9 is EOL; ESLint 10 vs plugins | Lint config errors | **Resolved in Phase 0: ESLint 10.** `eslint-plugin-react`, `-import` and `-jsx-a11y` declare `eslint <=9` but run cleanly on 10 once `settings.react.version` is explicit (auto-detect calls the removed `context.getFilename`). The peer ranges are allowed in `pnpm.peerDependencyRules`. Revisit when the plugins ship ESLint 10 support. |
| Turning lint back on (it has been silently off) | Hundreds of existing warnings/errors | Fix errors. Existing-code warnings stay warnings. Turn `rules-of-hooks` back on and fix any real hook bugs it finds. |
| Money Float → Decimal (D3) | Type changes everywhere; values change if any are stored at > 2 dp | Pre-check query for values with > 2 decimals, shown to you before migrating. |
| Order restructuring (D4) | None today (0 orders) | A clean single migration, SQL shown first, tested on the Neon `dev` branch. |
| Web ↔ admin cache invalidation across two deployments | `revalidateTag` in admin can't reach web's cache | A signed `POST /api/revalidate` on web, called by a shared `notifyStorefront(tags)` helper in admin (HMAC secret, fails loudly in logs, never blocks the admin save). |
| Removing Upstash Redis in favour of Next cache | Behaviour change | Removed only once cache tags cover every call site. Rate limiting keeps Upstash. |
| Existing customer passwords | Customers might be locked out | See §4 Phase 1: I need to check what the Clerk migration actually moved. |
| LibreOffice font substitution | Documents look different from design | Fonts come from the repo and are copied into the image. The worker's `/health` reports `fc-list` for the required fonts. |
| In-memory job store in the worker | Bulk jobs are lost on restart | Acceptable for now (the jobs are short). I'd persist job state in Postgres only if you run more than one worker instance. |
| Long tables in pptxgenjs (no auto page flow) | Quotation/catalogue PDF | Measure-and-split helper plus a 3-page test fixture (§1.7). |

---

## 3. Proposed schema changes

All changes are Prisma migrations (`prisma migrate dev` → committed SQL → `migrate deploy`). No `db push`, no `migrate reset`. Anything that drops or rewrites data is flagged **⚠** and needs your go-ahead before it runs.

### 3.1 Phase 0: datasource only
- Add `prisma.config.ts` with `datasource.url = env("DIRECT_URL")` for migrations.
- The runtime client uses `@prisma/adapter-neon` with `DATABASE_URL` (pooled, `-pooler` host).
- Generator becomes `prisma-client` with `output = "../generated/prisma"`, re-exported from `@repo/database`.
- No table changes.

### 3.2 Phase 1: auth / roles (assuming D2 = a)
- `AdminRole`: `owner → ADMIN`, `staff → STAFF` (enum rename, data mapped, not lossy).
- `User` gets `role UserRole @default(CUSTOMER)` (reserved for future customer tiers), plus `banned`, `banReason` and `banExpires` if we add the Better Auth `admin` plugin on the customer side.
- Remove the stray `User.configurationId` / `User.productId` relations if they are unused (checked with a query first) **⚠**.

### 3.3 Phase 2: catalog

```prisma
model Product {                         // existing, changes only
  price          Decimal  @db.Decimal(12,2)   // ⚠ D3 type change
  compareAtPrice Decimal? @db.Decimal(12,2)
  cost           Decimal? @db.Decimal(12,2)
  status         ProductStatus @default(ACTIVE)   // DRAFT | ACTIVE | ARCHIVED; backfilled from isActive/deletedAt
  lowStockThreshold Int @default(5)
  // quantity, productImages[], discount: deprecated, kept read-only until web moves off them, then dropped (⚠ separate migration)
}
model ProductVariant {                  // becomes the source of truth for SKU / stock / price
  price          Decimal? @db.Decimal(12,2)   // replaces priceOverride
  compareAtPrice Decimal? @db.Decimal(12,2)
  cost           Decimal? @db.Decimal(12,2)
  isActive Boolean @default(true)
  position Int     @default(0)
}
model ProductImage { width Int?  height Int?  format String?  bytes Int? }   // added from the Cloudinary upload response

// Structured, localized, grouped specifications (feeds datasheets)
model SpecGroup {
  id String @id @default(cuid())
  productId String
  position  Int @default(0)
  translations SpecGroupTranslation[]   // (groupId, language) unique → name
  items SpecItem[]
}
model SpecItem {
  id String @id @default(cuid())
  groupId  String
  position Int @default(0)
  unit     String?                       // "W", "lm", "K"; language-neutral
  translations SpecItemTranslation[]     // (itemId, language) unique → label, value
}
```
- A backfill script moves the fixed `ProductSpecification` columns into groups ("Electrical", "Optical", "Physical", "Chandelier") in both languages. The old table stays until the datasheet and web read the new one, then it is dropped **⚠**.
- `ProductTranslation` / `ProductSpecification` foreign keys point at `Product.productId` (the SKU string). If a SKU is renamed, it cascades. New tables use `Product.id`.

### 3.4 Phase 3: discounts

```prisma
model Discount {                        // extended
  name           String
  mode           DiscountMode           // AUTOMATIC | COUPON  (code required iff COUPON, CHECK constraint)
  scope          DiscountScope          // PRODUCTS | CATEGORIES | CART  (product/category/global mapped)
  value          Decimal @db.Decimal(12,2)
  minOrderValue  Decimal? @db.Decimal(12,2)
  usageLimit     Int?
  perCustomerLimit Int?
  usageCount     Int @default(0)
  stackable      Boolean @default(false)
  priority       Int @default(0)
  products   DiscountProduct[]          // replaces productId (backfilled)
  categories DiscountCategory[]         // replaces categoryId (backfilled)
  redemptions DiscountRedemption[]
}
model DiscountRedemption { id, discountId, orderId, userId?, customerEmail, amount Decimal, createdAt  @@index([discountId, userId]) }
```
- `code` is stored upper-cased and unique (case-insensitive lookup).
- `Product.discount` values are migrated into AUTOMATIC product-scope discounts, then the column is deprecated.

### 3.5 Phase 5: orders and customers

```prisma
model Customer {                        // D9: B2B / quotation customers, optional web account
  id String @id @default(cuid())
  userId String? @unique
  name String   companyName String?   email String?   phone String?   taxId String?
  preferredLanguage String @default("ar")
  addresses Address[]   quotations Quotation[]   orders Order[]
  notes String?
}
model Address { … replaces ShippingAddress's 1-per-user limit; type SHIPPING|BILLING; isDefault }

model Order {                           // header
  number     String @unique             // "ORD-2026-00042" from DocumentSequence
  customerId String?
  status     OrderStatus                // pending|confirmed|processing|shipped|delivered|cancelled|refunded (D5, clean rename)
  subtotal, discountTotal, taxTotal, shippingTotal, grandTotal  Decimal
  currency   String
  shippingAddress Json                  // snapshot
  billingAddress  Json?
  discountsApplied Json                 // snapshot of the pricing engine result
  quotationId String? @unique
  statusHistory OrderStatusEvent[]
  notes OrderNote[]
  // legacy single-product columns (productId, productName, productImages, productPrice, …) and isCompleted are DROPPED in the same migration (0 orders; D4)
}
model OrderItem { sku, name String (English snapshot), imageUrl, unitPrice, compareAtPrice, discountAmount, taxAmount, lineTotal Decimal; variantId? }
model OrderStatusEvent { orderId, from, to, byAdminId?, note?, createdAt }
model OrderNote        { orderId, adminId, body, isInternal, createdAt }
model StockMovement    { variantId, delta, reason (ORDER|CANCEL|REFUND|ADJUSTMENT|IMPORT), refId?, adminId?, createdAt }
```

### 3.6 Phase 4: documents (quotations, datasheets, catalogue)

```prisma
model Quotation {
  id String @id @default(cuid())
  number     String @unique             // "Q-2026-0001"
  customerId String
  status     QuotationStatus            // DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED
  currency   String
  validUntil DateTime
  subtotal, discountTotal, taxTotal, grandTotal  Decimal   // derived from lines on save, stored
  overallDiscountType DiscountType?   overallDiscountValue Decimal?
  taxRate    Decimal @db.Decimal(5,2)
  terms String?   notes String?
  companySnapshot Json                  // name, logo URL, address, tax no. at time of issue
  lines QuotationLine[]
  files GeneratedFile[]
  sentAt DateTime?   respondedAt DateTime?   createdById String   orderId String?
}
model QuotationLine {
  id, quotationId, position
  productId String?  variantId String?       // nullable: custom lines allowed; SetNull on product delete
  snapshot  Json                              // { sku, name, description, specs[...], imageUrl }; English content (D11)
  quantity Int   unitPrice Decimal   discountType DiscountType?   discountValue Decimal?   lineTotal Decimal
  edits     DocumentEdit[]
}
model Datasheet { id, number, productId, snapshot Json, companySnapshot Json, files GeneratedFile[], createdById, createdAt }
model Catalogue { id, number, title String, selection Json (categoryIds/productIds), snapshot Json, files GeneratedFile[], … }

model GeneratedFile { id, kind (PDF|XLSX|PPTX), url, providerId, bytes, quotationId?/datasheetId?/catalogueId?/orderId? (invoice), createdAt }

// Write-back audit: one row per overridden field
model DocumentEdit {
  id, documentType, documentId, productId,
  field      String       // "description" | "specs" | "price"; write-back targets the product's English translation
  before Json   after Json
  writeBack  Boolean @default(false)   // the "also update the product" checkbox, OFF by default
  appliedAt  DateTime?                  // set when write-back committed
  adminId, createdAt
}
model DocumentSequence { type String @id  prefix String  year Int  next Int }   // row-locked increment (SELECT … FOR UPDATE) in the create transaction
```

**Snapshot rule:**
- When a product is added to a document, its content is copied into `snapshot`, and edits change only the snapshot.
- If `writeBack` is ticked for a field, the same transaction also updates the product through the normal product service. That means price changes still write `PriceHistory` and `AuditLog`, and storefront revalidation still fires.
- The PDF/XLSX is rendered **only from the snapshot**. A SENT, ACCEPTED or REJECTED document is read-only, and "duplicate as new version" creates a new draft.

### 3.7 Phase 7: settings and audit

```prisma
model CompanySettings { id "default", name String, logoUrl, logoProviderId, address Json, phone, email, website, taxNumber, commercialRegister, brandColor, defaultCurrency, defaultTaxRate Decimal, quotationValidityDays Int, … }
model TermsTemplate   { id, kind (QUOTATION|INVOICE), name, body String (English, D11), isDefault }
model AuditLog        { id, actorId, actorType (ADMIN|SYSTEM), entity, entityId, action, before Json?, after Json?, createdAt  @@index([entity, entityId]) }
```
`PriceHistory` stays and is also mirrored into `AuditLog`. Discount create/update/deactivate always writes `AuditLog`.

---

## 4. Phases and tasks

Each phase ends with: `pnpm check-types && pnpm lint && pnpm build` green, migrations committed, strings present in `ar` and `en`, no secrets, one commit (or a few logical commits), and a short summary to you. I stop after each phase.

Admin UI work in Phases 2–7 goes through the design-master workflow, using the admin's **existing** shadcn design system (the repo's design system wins). No new visual direction.

### Phase 0: Maintenance and upgrade
Order matters. Each step is its own commit, and the repo builds after every one.
1. **Baseline:** commit the uncommitted datasheet work as-is (D1).
2. **Fix lint tooling:** scope the root `minimatch` override so eslint loads. Replace `next lint` with `eslint .`, delete the legacy `.eslintrc.json` files, wire both apps and all packages to `packages/eslint-config`, and turn `rules-of-hooks` back on.
3. **Type-check wiring:** add a `check-types` script to every package, remove the root `type-check` alias, and wire both apps and packages to `packages/typescript-config`. Fix the bad `paths`/`include` entries in `apps/web/tsconfig.json`.
4. **Dependency upgrades (everything except Prisma).** Versions are pinned through a pnpm catalog so the two apps can't drift again:
   - next **16.3.5** in both apps (today they are on 16.0.10 and 16.1.5)
   - react / react-dom **19.3.0**
   - next-intl **4.14.x**
   - turbo **2.11.x**
   - better-auth **1.7.x**
   - typescript **6.0.3**
   - eslint 9 or 10 (see Risks)
   - eslint-config-next **16.3.x**
   - tailwindcss **4.3.x**
   - zod **4.6.x**
   - pptxgenjs **4.0.1**
   - @types/node **22**

   Then run the codemods (`@next/codemod`, next-intl 4 notes) and Better Auth 1.7's schema `generate` diff (if the auth tables need changes, that is a migration, shown first).
5. **Dead code** (every deletion listed in the summary; nothing referenced is deleted):
   - unused dependencies: `next-cloudinary`, `next-config`, `dotenv-flow`
   - the `styledComponents` compiler flag
   - the duplicate i18n config in web
   - Clerk leftovers: `turbo.json` env, comments, and the catch-all route names (`sign-in/[[...sign-in]]` → `sign-in`)
   - `tsbuildinfo` files (untracked)
   - the dead `db:seed` / `import:products` scripts, which are either implemented or removed
   - `add-performance-indexes.sql` is kept until Phase 6 (search)
6. **Environment:**
   - `.env.example` at the root, per app and for the worker, every variable commented (the web/admin auth ones exist since the hotfix)
   - `turbo.json` `build.env` / `globalEnv` corrected
   - zod env validation per app (`env.ts`)
7. **Admin i18n (D8), separate commit(s):** next-intl without URL routing, locale from a cookie and the admin's preference, `ar`/`en` messages, `dir` on `<html>`, an Arabic font, and every existing admin string extracted.
8. **Prisma 6 → 7, last, in its own commit:**
   - `prisma.config.ts` (`DIRECT_URL` for migrations)
   - the `prisma-client` generator with an output path
   - `@prisma/adapter-neon` on the pooled `DATABASE_URL`
   - an `exports` field on `@repo/database`, and every import updated
   - the datasheet worker Dockerfile updated for the new client
9. **Verify:**
   - `pnpm install`, `check-types`, `lint` and `build` for web, admin, the worker and the packages
   - the worker image builds and `/health` passes under local Docker
   - smoke-run both apps in the browser pane (home, a product page, admin login)

### Phase 1: Authentication and roles
1. Roles ADMIN / STAFF / CUSTOMER (§3.2). Better Auth `access`/permission definitions in one shared `@repo/auth` package (roles and permission matrix: `product:write`, `price:write`, `discount:write`, `quotation:*`, `order:*`, `settings:*`, `staff:*`).
2. Admin `proxy.ts`: an optimistic cookie check that redirects to sign-in, plus **a mandatory server-side `requirePermission()` in every server action and route handler** (the proxy is not the security boundary). Add an ESLint rule or test that fails when an action file has no guard.
3. Web: customer sign-in/up, email verification and password reset flows (the emails themselves are wired up in Phase 5; until then Better Auth's hooks log to the console in development).
4. Fix the security findings in §1.5, including ownership checks on every `/api/orders*` route.
5. **Existing users migration: nothing to migrate** (0 customers, see §0). Admins: the single existing owner is mapped to `ADMIN` by the enum rename (no password reset). If the live site turns out to use a *different* database from the one checked, re-run the read-only count there before Phase 1.
6. Move web API routes out of `[locale]/api` to `app/api` (the old paths redirect).

### Phase 2: Product management
1. Migrations from §3.3, including the Decimal change (D3; the pre-check result is shown to you first).
2. A shared product domain service in `packages/catalog` (zod schemas and mutations), used by the admin actions, the Excel import and quotation write-back, so all three follow the same rules.
3. Admin UI:
   - product list with filters (status, category, brand, stock), column sorting and pagination
   - product editor tabs: General, Pricing (price, compare-at, cost, margin), Variants (SKU/stock/price), Localized content (ar/en side by side), Specifications (grouped, drag to reorder, per-language), Images, SEO
   - categories CRUD with translations and reordering
4. **Images:**
   - Signed direct uploads: the server signs the Cloudinary params and the browser uploads straight to Cloudinary (no base64 through Server Actions), with multiple files and progress.
   - Then register `public_id`, URL and dimensions, drag-to-reorder, set primary, and delete (Cloudinary `destroy`, then DB delete; if Cloudinary fails, the row is kept and the error shown).
   - A backfill script uploads the existing `/public` product images to Cloudinary and fills `ProductImage`.
5. **Bulk price editing:** select products, then set / increase / decrease by % or amount (price or compare-at), with a preview diff before applying. Everything runs in one transaction and writes PriceHistory and AuditLog.
6. **Excel import/export (exceljs):**
   - Export uses the current filters. This is a data round-trip file, not a customer document, so it carries **both** languages as columns (`name_en`, `name_ar`, …) plus a specs sheet. Headers are English and the sheet is left-to-right.
   - Import is upload → validate every row (zod) → preview screen showing create/update/errors per row → apply in batches. Matching is by SKU. Import never deletes.
7. Web migrates off `Product.productImages[]` / `Product.quantity` / `Product.discount` (reads the new tables).

### Phase 3: Discounts and promotions
1. Migrations from §3.4, plus the backfill of the old discounts.
2. **`packages/pricing`**: a pure, framework-free function that the admin and the web both use:
   `computePricing({ lines, discounts, coupon?, customer?, now, taxRate, currency }) → { lines[{unit, compareAt, discount, total}], applied[], rejected[{code, reason}], subtotal, discountTotal, tax, grandTotal }`
   - Uses Decimal arithmetic with no floats.
   - Rules: active, date window, minimum order, usage limit, per-customer limit, scope match, stacking (non-stackable discounts compete by highest customer value; stackable ones apply in `priority` order), and never below zero.
   - Comes with thorough unit tests (Vitest), including property tests for "total never negative" and "stacking order independent when all are stackable".
3. The server validates coupons in the cart/checkout server action. Redemptions are recorded in the order transaction with a row lock on the discount (`usageCount` check-and-increment), so concurrent checkouts can't exceed the limit.
4. Admin UI: discount list and editor (scope pickers for products and categories, rules, preview "what would this cart pay"), activate/deactivate, and redemption stats.

### Phase 4: Quotations, datasheets and catalogue (Altruvex approach)
0. **Cloudinary check (D6):** confirm the account can deliver PDF/ZIP raw files (Settings → Security → *Allow delivery of PDF and ZIP files*, off by default on free plans) with a test upload and a signed fetch. Report what to enable before building on it.
1. **Long-table fixture:** a 3-page quotation, rendered to PDF and XLSX, to validate pagination (§1.7) before the templates are finalized.
2. Generalize the worker into `apps/document-worker`:
   - `/convert`, `/preview` (PNG pages), and the existing bulk jobs
   - the Noto Naskh Arabic fallback font added to the image, `fc-list` in `/health`
   - pptxgenjs 4
   - still a plain, host-agnostic Dockerfile configured only by env vars, with a `docker compose` file for local development
   - **Durable bulk jobs (D7):** jobs are stored in Postgres (`DocumentJob`: status `QUEUED | RUNNING | DONE | FAILED`, params, progress, attempts, error, result file). Output ZIP/PDF files go to Cloudinary, not local disk or memory, so downloads survive a restart. On startup the worker re-queues `QUEUED`/`RUNNING` jobs (generation is idempotent), up to 3 attempts. After that a job is `FAILED` with a clear error, and the admin shows a **Retry** button that creates a new attempt. If the worker is unreachable, the admin shows "worker offline" instead of polling forever.
3. `packages/documents` (it grows out of `packages/datasheet`):
   - shared tokens and branding from `CompanySettings`
   - page header/footer and table pagination primitives
   - templates `quotation`, `datasheet`, `catalogue` and `invoice` (the invoice is used in Phase 5)
   - `xlsx/quotation.ts` (exceljs, with a formula-live totals column)
4. Migrations from §3.6, plus the numbering service.
5. Quotation editor (admin):
   - pick or create a customer, add products (search), per-line quantity, price and discount
   - overall discount, tax, validity, terms (from a template), notes
   - live totals come from `packages/pricing`
   - **per-line "Edit content for this document"** drawer: description (English), specs, price, each with an **"Also update the product in the database"** checkbox, off by default. The confirm dialog lists exactly which product fields will change.
   - Preview (PNG pages), generate PDF and XLSX, stored as `GeneratedFile`
6. Status workflow: DRAFT → SENT (when emailed or marked sent) → ACCEPTED / REJECTED, and EXPIRED by a daily job (a Vercel cron route) when `validUntil` has passed. **Convert to order** is available on ACCEPTED: it creates an order from the snapshot prices (it doesn't reprice), decrements stock and links the two records.
7. Email the quotation: Resend with a React Email template (English), a signed link to the PDF and optionally the attachment. The send is logged. (The Resend setup lands here if Phase 5 hasn't happened yet.)
8. Datasheets: the existing single/bulk flow stays English (the unused `language` parameter is removed) and saves a `Datasheet` snapshot record. The same edit-and-optional-write-back drawer applies. Product specs come from the new `SpecGroup`s.
9. Catalogue: choose categories or products and cover options, then generate a job on the worker: cover, table of contents by category, one product per half or full page, and a back cover with company info.

### Phase 5: Orders and transactional email
1. Migrations from §3.5: one clean migration for D4/D5 (SQL shown first, run on `dev` first, production only after approval).
2. Admin orders:
   - list with filters (status, date, customer, total, payment) and search by number or email
   - detail page with a timeline, notes and a status workflow with allowed transitions (a state machine in `packages/orders`)
   - invoice PDF built from the Phase 4 templates
3. Stock:
   - decrement is transactional on order confirm; cancel/refund restores stock
   - every change writes a `StockMovement`
   - low-stock badge and filter based on `lowStockThreshold`
4. Customers section: profile, addresses, orders, quotations and lifetime value.
5. `packages/emails`: React Email templates, **English only, one template each** (D11), sent through Resend:
   - order confirmation
   - status update
   - shipped (with tracking)
   - quotation sent
   - welcome
   - email verification and password reset (wired into Better Auth's `sendVerificationEmail` / `sendResetPassword`)
   - admin notification of a new order (to a configurable address list)
   Emails are sent after the transaction commits, with failures logged and never blocking the order. There is a dev preview (`email dev`).

### Phase 6: Storefront
1. **Caching and revalidation:**
   - Adopt Next 16 `cacheComponents` with `'use cache'` + `cacheTag('product:<id>', 'products', 'category:<id>', 'discounts')` on all catalogue reads, and remove the Redis catalogue cache (Upstash stays for rate limiting).
   - Add a signed `POST /api/revalidate`. Admin `notifyStorefront(tags)` is called from every product, price, image, category and discount mutation (it lives inside the domain services, so no entry point can forget it).
   - Remove the `force-dynamic` + `generateStaticParams` conflicts.
2. Prices: `packages/pricing` on product cards, product pages and the cart. Struck-through compare-at price, a "-20%" badge, and the automatic discount label.
3. Cart and checkout: coupon field, server-validated totals, stock state (in stock / low / out), and address book.
4. Cloudinary-optimized images (`next/image` with a Cloudinary loader: `f_auto,q_auto`, responsive widths).
5. Search and filters: Postgres full-text search (turning `add-performance-indexes.sql` into a migration, with Arabic normalization of alef/ya/ta-marbuta) plus facets for category, brand, IP, color temperature and price range.
6. Customer account: profile, addresses, order history and detail, quotations.
7. "Request a quotation" (from the product page or the cart): creates a DRAFT quotation in the admin and emails staff.
8. Download-datasheet button: serves the latest generated (English) datasheet on both locales, generating and caching it if it is missing.
9. **Gaps found, you choose which to build:**
   - payment gateway (D10)
   - wishlist
   - product reviews
   - related products / recently viewed
   - SEO: `sitemap.xml`, `robots`, JSON-LD Product, hreflang ar/en (partly missing)
   - Open Graph images
   - newsletter
   - guest checkout
   - shipping zones and rates
   - order tracking page without login
   - WhatsApp contact / order button
   - analytics / events
   - cookie consent
   - 404/500 localized pages audit
   - performance budget (the home page loads gsap + framer-motion + 2 carousels)

### Phase 7: Dashboard and finishing
1. Dashboard: sales (a range picker, compared with the previous period), order count by status, average order value, top products, low stock, recent quotations, and quotation → order conversion rate. Charts follow the dataviz rules, in both languages.
2. Settings (§3.7): company info and logo (used by documents and emails), tax, currency, document numbering (prefix and reset yearly), terms templates, and admin notification recipients.
3. Audit log viewer: filter by entity, actor and date, with a before/after diff.
4. README: architecture, setup, every environment variable, how to run web, admin, the worker (Docker) and the email preview, migrations workflow, and deploy notes.

---

## 5. What you'll need to configure (collected across phases)

| Service | Variables (all in `.env.example`) |
|---|---|
| Neon | `DATABASE_URL` (pooled), `DIRECT_URL` (direct, for migrations) |
| Better Auth | `BETTER_AUTH_SECRET` (web + admin, **different** values), `BETTER_AUTH_URL` per app |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (renamed from `CLOUD_*`, old names read as a fallback for one release), `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAILS`, plus a verified sending domain |
| Document worker | `DOCUMENT_WORKER_URL`, `DOCUMENT_WORKER_SECRET` (renamed from `DATASHEET_*`, with a fallback) |
| Storefront revalidation | `STOREFRONT_URL`, `REVALIDATE_SECRET` |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting) |
| Cron | `CRON_SECRET` (quotation expiry) |

---

## 6. Out of scope unless you say otherwise
- Multi-warehouse inventory, purchase orders and suppliers.
- Accounting integration (ETA e-invoicing for Egypt is a candidate for a later phase).
- Changing the storefront's visual design (only the new features are styled, within the existing design).
