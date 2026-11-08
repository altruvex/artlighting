/**
 * The add-to-cart a guest asked for, kept until they are signed in.
 *
 * The cart lives on the account, so a guest's tap cannot add anything yet.
 * Rather than lose the tap behind "please sign in first", the intent is
 * written here (this tab's sessionStorage), the customer is sent to sign
 * in with a way back, and PendingCartResumer completes the add on return.
 * The intent is read once and cleared on read, so a re-render cannot add
 * the product twice; it also expires, so a tab reopened the next day does
 * not add something the customer has forgotten about.
 */
export interface PendingAdd {
  productId: string;
  /** For the success toast; the server does not need it. */
  productName: string;
  quantity: number;
  savedAt: number;
}

const KEY = "artlighting:pending-add";
const TTL_MS = 30 * 60 * 1000;
/**
 * What actions/cart addToCart accepts (its MAX_QUANTITY). A stored value
 * outside it — edited storage, say — is dropped rather than sent to fail.
 */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

export function savePendingAdd(intent: Omit<PendingAdd, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...intent, savedAt: Date.now() } satisfies PendingAdd));
  } catch {
    // Storage blocked or full: the customer still gets to sign in, and
    // adds the product again by hand.
  }
}

/** Reads the pending add and clears it, or null when there is none, it has expired, or it is not a quantity the cart takes. */
export function takePendingAdd(): PendingAdd | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingAdd(parsed)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isPendingAdd(value: unknown): value is PendingAdd {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === "string" &&
    v.productId.length > 0 &&
    typeof v.productName === "string" &&
    Number.isInteger(v.quantity) &&
    (v.quantity as number) >= MIN_QUANTITY &&
    (v.quantity as number) <= MAX_QUANTITY &&
    typeof v.savedAt === "number"
  );
}

/**
 * The sign-in page, told where to come back to. `returnTo` is a locale-less
 * path (what `usePathname` from "@/i18n/navigation" gives), so the i18n
 * router adds the locale on the way there and again on the way back.
 */
export function signInPath(returnTo: string): string {
  return `/sign-in?redirect=${encodeURIComponent(returnTo)}`;
}

/** The current page as a return path: the route plus whatever query it carries (shop filters, say). */
export function currentReturnPath(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  return `${pathname}${window.location.search}`;
}
