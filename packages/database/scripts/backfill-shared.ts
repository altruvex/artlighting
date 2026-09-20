/**
 * What every backfill in this phase shares.
 *
 * The rules Ali set: a backfill is not a schema migration. Each one is an
 * ordinary script that can be run again without doing damage, has a dry run
 * that writes nothing, and refuses to touch production unless told to in as
 * many words.
 */
export interface BackfillOptions {
  /** Report what would change and write nothing. */
  dryRun: boolean;
  /** Stop after this many products; for a cautious first run. */
  limit?: number;
  /**
   * Prepended to every generated storage id. Exists so the apply path can
   * be exercised on the dev database without writing over the real
   * `products/<sku>/<n>` assets, which live in the one shared Cloudinary
   * account whichever database you point at.
   */
  idPrefix?: string;
}

export function parseBackfillArgs(argv: string[]): BackfillOptions {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const limitFlag = argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitFlag ? Number(limitFlag.slice("--limit=".length)) : undefined;
  const prefixFlag = argv.find((arg) => arg.startsWith("--id-prefix="));
  const idPrefix = prefixFlag ? prefixFlag.slice("--id-prefix=".length).replace(/^\/+|\/+$/g, "") : undefined;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error(`--limit must be a positive integer, got ${limitFlag}`);
  }
  // Explicit, because a backfill that writes when you meant to preview is
  // exactly the accident the dry run exists to prevent.
  if (!dryRun && !argv.includes("--apply")) {
    throw new Error("Pass --dry-run to preview, or --apply to write. Neither was given.");
  }
  return { dryRun, limit, idPrefix };
}

export function reportHeader(name: string, options: BackfillOptions, host: string): void {
  console.log(`\n${name}`);
  console.log(`  mode:     ${options.dryRun ? "DRY RUN (writes nothing)" : "APPLY"}`);
  console.log(`  database: ${host}`);
  if (options.limit) console.log(`  limit:    ${options.limit}`);
  if (options.idPrefix) console.log(`  id prefix: ${options.idPrefix}/  (test run — not the real ids)`);
  console.log("");
}
