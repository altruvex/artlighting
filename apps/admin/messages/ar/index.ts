// Messages are split by area so they can be edited independently; every
// file here must exist in both messages/en and messages/ar with identical
// keys (enforced by scripts/check-messages.mjs in `check-types`).
import core from "./core.json";
import orders from "./orders.json";
import people from "./people.json";
import products from "./products.json";

const messages = { ...core, ...products, ...orders, ...people };
export default messages;
