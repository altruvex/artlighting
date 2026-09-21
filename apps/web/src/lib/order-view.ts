/**
 * An order as the storefront's order pages render it.
 *
 * The address step, the review and the thank-you page each used to fetch
 * the raw order and recompute its price in the browser from the product
 * row — three copies of the arithmetic, each one able to disagree with
 * what was charged. They read this instead: every figure is the one stored
 * on the order when it was placed, as a string (money crosses to the
 * client as a string, never a float), and a line per product.
 */
export interface OrderLineView {
  id: string;
  /** The product's code, for the link back to it. */
  productId: string;
  /** In the order's viewing locale where a translation exists. */
  name: string;
  image: string | null;
  brand: string | null;
  href: string | null;
  quantity: number;
  /** One unit as configured, before discounts. */
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
  productIp: string | null;
  bulb: { name: string; wattage: number } | null;
}

export interface OrderView {
  id: number;
  isCompleted: boolean;
  status: string;
  createdAt: string;
  subtotal: string;
  discountTotal: string;
  shippingPrice: string;
  totalPrice: string;
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;
  lines: OrderLineView[];
  /** Units across every line. */
  itemCount: number;
}
