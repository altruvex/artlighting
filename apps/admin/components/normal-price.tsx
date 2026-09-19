import { useFormatter } from "next-intl";

type ProductPrices = {
  price: number;
  quantity?: number;
  shippingPrice?: number;
  sectionType?: string;
};

export default function NormalPrice({
  price,
  quantity = 1,
  shippingPrice = 0,
}: ProductPrices) {
  const format = useFormatter();
  const normalPrice = Math.ceil(price);
  const PriceAfterTimesQuantity = normalPrice * quantity + shippingPrice;
  const formattedTotalPrice = format.number(PriceAfterTimesQuantity, {
    style: "currency",
    currency: "EGP",
  });
  return (
    <div>
      <p>{formattedTotalPrice}</p>
    </div>
  );
};