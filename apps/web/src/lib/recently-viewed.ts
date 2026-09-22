/**
 * The products this browser has looked at, newest first.
 *
 * Kept in localStorage, not the database: it is a convenience for the
 * shopper in front of this screen, it needs no account, and nothing about
 * it has to survive a cleared browser. Only product codes are stored — the
 * cards are fetched fresh, so a price or a discount is never shown as it
 * was on the day of the visit.
 */
const KEY = "artlighting:recently-viewed";
const EVENT = "artlighting:recently-viewed-changed";
export const RECENTLY_VIEWED_MAX = 12;

export function readRecentlyViewed(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === "string").slice(0, RECENTLY_VIEWED_MAX) : [];
  } catch {
    // Private windows and blocked storage throw; there is simply no history.
    return [];
  }
}

function write(codes: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes.slice(0, RECENTLY_VIEWED_MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Best-effort, as above.
  }
}

export function recordRecentlyViewed(productId: string) {
  write([productId, ...readRecentlyViewed().filter((code) => code !== productId)]);
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Best-effort, as above.
  }
}

export function onRecentlyViewedChanged(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
