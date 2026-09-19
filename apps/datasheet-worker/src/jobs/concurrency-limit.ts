/**
 * Runs `fn` over `items` with at most `limit` in flight at once. No new
 * dependency (e.g. p-limit) — this is small enough to hand-roll, matching
 * this repo's existing lean-dependency posture.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T, i);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/**
 * A separate, tighter gate specifically for LibreOffice conversions.
 * Proven necessary, not speculative: running the same conversion at the
 * data-fetch concurrency (3) crashed a LibreOffice instance under
 * contention in a real local test — multiple headless soffice processes
 * fighting over shared resources, even with isolated profiles each. Image
 * fetching and PPTX building stay at the higher `mapWithConcurrency` limit;
 * only the conversion step funnels through this.
 */
export class Semaphore {
  private readonly waiters: (() => void)[] = [];
  private active = 0;

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.waiters.shift();
      if (next) next();
    }
  }
}
