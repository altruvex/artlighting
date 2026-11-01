/**
 * A readable flag that this browser has saved a guest configuration.
 *
 * The guest token itself is httpOnly (lib/guest-token.ts), and every
 * visitor gets one, so the page cannot tell a guest who saved options from
 * one who only looked. ensureConfiguration sets this when it creates a
 * guest's row; ProductDetail asks for the saved state only when the
 * visitor is signed in or carries this flag. It holds no secret.
 */
export const GUEST_CONFIG_HINT = "guest_cfg";

export function hasGuestConfigHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((pair) => pair.startsWith(`${GUEST_CONFIG_HINT}=`));
}
