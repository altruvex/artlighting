/**
 * The header search's limits, shared by the field and its server action
 * (a "use server" file may export only async functions).
 */

/** Shorter terms match most of the catalogue and are not worth a round trip. */
export const MIN_SEARCH_LENGTH = 2;

/** Rows the dropdown shows; the rest are behind "view all". */
export const SEARCH_SHOWN = 6;
