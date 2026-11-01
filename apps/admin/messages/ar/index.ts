// Messages are split by area so they can be edited independently; every
// file here must exist in both messages/en and messages/ar with identical
// keys (enforced by scripts/check-messages.mjs in `check-types`).
import core from "./core.json";
import orders from "./orders.json";
import people from "./people.json";
import products from "./products.json";
import quotations from "./quotations.json";
// Strings the shared @repo/ui components read (dialog close, sidebar).
import ui from "./ui.json";

const messages = { ...core, ...products, ...orders, ...people, ...quotations, ...ui };
export default messages;
