"use client";

import ProductCard from "@/components/product-card/product-card";
import { multiplyMoney, serializeMoney, serializeRate } from "@repo/money"
import ProductImages from "@/components/product-images-for-chand";
import ProductMainInfo from "@/components/product-main-Info";
import ProductSpecifications from "@/components/product-specifications-table";
import {
  LocalizedProductWithRelations,
  Order,
  ProductSpecification,
  ProductsProps,
  SpecificationsTable,
  ProductCardProps,
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
  relatedProducts,
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
  const transformToChandelierProductCardProps = (relatedProduct: LocalizedProductWithRelations): ProductCardProps => {
    const specs = relatedProduct.localizedSpecs || {};

    const mockSpecification: ProductSpecification = {
      id: `spec-${relatedProduct.productId}`,
      productId: relatedProduct.productId,
      language: locale,
      input: specs.input || relatedProduct.input || null,
      mainMaterial: specs.mainMaterial || relatedProduct.mainMaterial || null,
      finish: specs.finish || relatedProduct.finish || null,
      colorTemperature: specs.colorTemperature || relatedProduct.colorTemperature || null,
      lampBase: specs.lampBase || relatedProduct.lampBase || null,
      lifeTime: specs.lifeTime || relatedProduct.lifeTime || null,
      bulb: specs.bulb || null,
      brandOfLed: null,
      luminousFlux: null,
      cri: null,
      beamAngle: null,
      workingTemperature: null,
      fixtureDimmable: null,
      electrical: null,
      powerFactor: null,
      ip: null,
      energySaving: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      productId: relatedProduct.productId,
      productName: relatedProduct.productName,
      price: serializeMoney(relatedProduct.price),
      discount: relatedProduct.discount,
      productImages: relatedProduct.productImages,
      Brand: relatedProduct.brand,
      brand: relatedProduct.brand,
      chandelierLightingType: relatedProduct.chandelierLightingType || "",
      sectionType: relatedProduct.sectionType,
      specification: mockSpecification,
      hNumber: relatedProduct.hNumber ?? undefined,
      spotlightType: relatedProduct.spotlightType,
      mainMaterial: specs.mainMaterial || (relatedProduct.mainMaterial ?? undefined),
      colorTemperature: specs.colorTemperature || (relatedProduct.colorTemperature ?? undefined),
      lifeTime: specs.lifeTime || (relatedProduct.lifeTime ?? undefined),
      finish: specs.finish || (relatedProduct.finish ?? undefined),
      input: specs.input || (relatedProduct.input ?? undefined),
      lampBase: specs.lampBase || (relatedProduct.lampBase ?? undefined),
      maximumWattage: undefined,
      beamAngle: undefined,
      luminousFlux: undefined,
      energySaving: undefined,
      cri: undefined,
      brandOfLed: undefined,
      electrical: undefined,
      ip: undefined,
    };
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants}>
      <div className="py-8 md:py-16" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <Container>
          <div className="space-y-12">
            <div className="flex items-start flex-col md:flex-row gap-8">
              <ProductImages productImages={product.productImages} />
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