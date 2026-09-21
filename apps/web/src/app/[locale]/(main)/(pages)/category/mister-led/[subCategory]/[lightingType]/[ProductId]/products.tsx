"use client";

import { specNumbersByKey, specsByKey } from "@/lib/specs-view";
import { multiplyMoney, serializeMoney } from "@repo/money"
import ProductImages from "@/components/product-images-for-chand";
import ProductMainInfo from "@/components/product-main-Info";
import ProductSpecifications from "@/components/product-specifications-table";
import {
  Order,
  ProductsProps,
  SpecificationsTable,
  OrderStatus
} from "@/types/products";
import { Container } from "@/components/container";
import { motion, type Variants } from "framer-motion";
import { useState } from "react";

const pageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function ChandelierProducts({
  product,
  configuration,
  locale,
}: ProductsProps) {
  const [quantity, setQuantity] = useState(1);

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const order: Order = {
    id: 0,
    userId: "",
    productId: product.productId,
    productName: product.productName,
    productImages: product.productImages,
    productColorTemp: product.productColor || "warm",
    productIp: product.productIp || "IP20",
    productChandLamp: product.productChandelierLamp || "lamp9w",
    quantity: quantity,
    isCompleted: false,
    currency: "EGP",
    createdAt: new Date(),
    updatedAt: new Date(),
    configurationId: configuration?.id || "",
    productPrice: serializeMoney(product.price),
    discountedPrice: null,
    discountApplied: false,
    discountRate: null,
    totalPrice: multiplyMoney(product.price, quantity).toFixed(2),
    configPrice: serializeMoney(configuration?.configPrice ?? product.price),
    priceIncrease: serializeMoney(configuration?.priceIncrease ?? 0),
    brand: product.brand,
    chandelierLightingType: product.chandelierLightingType || "",
    shippingPrice: "69.00",
    shippingAddressId: null,
    orderTimeReceived: null,
    status: OrderStatus.awaiting_shipment,
    customerLanguage: "ar"
  };

  const buildChandelierSpecificationsTable = (): SpecificationsTable => {
    const specs = product.localizedSpecs || {};
    const fallbackSpecs = {
      input: product.input || "",
      maximumWattage: product.maximumWattage?.toString() || "",
      mainMaterial: product.mainMaterial || "",
      finish: product.finish || "",
      colorTemperature: product.colorTemperature || "",
      lampBase: product.lampBase || "",
      lifeTime: product.lifeTime || "",
      hNumber: product.hNumber?.toString() || "",
    };

    const result: SpecificationsTable = {};

    const safeAssign = (key: string, value: string | undefined) => {
      if (value && value.trim() !== "") {
        result[key] = value;
      }
    };

    // Chandelier-specific specifications (simpler than Balcom)
    safeAssign(
      locale === 'ar' ? 'المدخل' : 'Input',
      specs.input || fallbackSpecs.input
    );
    safeAssign(
      locale === 'ar' ? 'أقصى قوة كهربائية (w)' : 'Maximum wattage',
      specs.maximumWattage || fallbackSpecs.maximumWattage
    );
    safeAssign(
      locale === 'ar' ? 'مادة التصنيع' : 'Main Material',
      specs.mainMaterial || fallbackSpecs.mainMaterial
    );
    safeAssign(
      locale === 'ar' ? 'التشطيب' : 'Finish',
      specs.finish || fallbackSpecs.finish
    );
    safeAssign(
      locale === 'ar' ? 'درجة حرارة لون الإضاءة' : 'Color Temperature',
      specs.colorTemperature || fallbackSpecs.colorTemperature
    );
    safeAssign(
      locale === 'ar' ? 'قاعدة اللمبة' : 'Lamp Base',
      specs.lampBase || fallbackSpecs.lampBase
    );
    safeAssign(
      locale === 'ar' ? 'اللمبة' : 'BULB',
      specs.bulb || 'No'
    );
    safeAssign(
      locale === 'ar' ? 'العمر الافتراضي' : 'Life Time',
      specs.lifeTime || fallbackSpecs.lifeTime
    );
    return result;
  };

  const specificationsTable = buildChandelierSpecificationsTable();
  // Addressed by language-neutral key, so a lookup works in either locale.
  const specs = specsByKey(product.specGroups ?? []);
  const specNumbers = specNumbersByKey(product.specGroups ?? []);
  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants}>
      <div className="py-8 md:py-12" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <Container>
          <div className="space-y-16">
            {/* The gallery holds its place while the decisions scroll: on a
                wide screen a shopper comparing options should still be able
                to see what they are buying. */}
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12">
              <div className="lg:sticky lg:top-24">
                <ProductImages productImages={product.productImages} />
              </div>
              <ProductMainInfo
                productName={product.productName}
                price={product.price}
                quantity={quantity}
                increaseQuantity={increaseQuantity}
                decreaseQuantity={decreaseQuantity}
                productId={product.productId}
                configId={configuration?.id || product.id}
                discount={product.discount}
                order={order}
                Brand={product.brand}
                chandelierLightingType={product.chandelierLightingType || ""}
                hNumber={product.hNumber}
                bulbChoices={product.bulbChoices ?? []}
                specGroups={product.specGroups}
                lightingTypeName={product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? undefined}
                configuration={configuration}
                sectionTypes={[product.sectionType]}
                sectionType={product.sectionType}
                mainMaterial={product.localizedSpecs?.mainMaterial || product.mainMaterial || ""}
                beamAngle={undefined}
                spotlightType={product.spotlightType}
                luminousFlux={undefined}
                colorTemperature={product.localizedSpecs?.colorTemperature || product.colorTemperature || ""}
                lifeTime={product.localizedSpecs?.lifeTime || product.lifeTime || ""}
                energySaving={undefined}
                cri={undefined}
                brandOfLed={undefined}
                electrical={undefined}
                finish={product.localizedSpecs?.finish || product.finish || undefined}
                input={product.localizedSpecs?.input || product.input || undefined}
                lampBase={product.localizedSpecs?.lampBase || product.lampBase || undefined}
              />
            </div>
            <div className="space-y-12">
              <ProductSpecifications
                specificationsTable={specificationsTable}
                specGroups={product.specGroups}
                Brand={product.brand}
                chandelierLightingType={product.chandelierLightingType || undefined}
                hNumber={product.hNumber}
                sectionType={product.sectionType}
                locale={locale}
              />
            </div>
          </div>
        </Container>
      </div>
    </motion.div>
  );
}