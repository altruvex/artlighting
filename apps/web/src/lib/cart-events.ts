/**
 * "The cart changed" — said once, heard by the header.
 *
 * The badge on the cart button read a list the sidebar only fetched when it
 * was opened, so it showed nothing until you opened the thing it was meant
 * to describe. The button now loads the cart itself, and anything that adds
 * a product says so here.
 */
export const CART_CHANGED = "cart:changed";

export function notifyCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_CHANGED));
}

/** Calls `onChange` whenever anything on the page changes the cart. */
export function onCartChanged(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CART_CHANGED, onChange);
  return () => window.removeEventListener(CART_CHANGED, onChange);
}
