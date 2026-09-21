"use client";

import ColorTemperatureSection from "@/components/color-temperature-section";
import { specNumbersByKey, specsByKey } from "@/lib/specs-view";
import { multiplyMoney, serializeMoney } from "@repo/money"
import { Container } from "@/components/container";
import ProductFeatures from "@/components/product-features";
import ProductImages from "@/components/product-images";
import ProductMainInfo from "@/components/product-main-Info";
import ProductSpecifications from "@/components/product-specifications-table";
import {
  Order,
  ProductsProps,
  SpecificationsTable,
  OrderStatus,
  SupportedLanguage,
  ProductIP
} from "@/types/products";
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

export default function BalcomProducts({
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
    status: "awaiting_shipment" as OrderStatus,
    currency: "EGP",
    customerLanguage: locale as SupportedLanguage,
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
  };

  const buildBalcomSpecificationsTable = (): SpecificationsTable => {
    const specs = product.localizedSpecs || {};
    const fallbackSpecs = {
      input: product.input || "",
      maximumWattage: product.maximumWattage?.toString() || "",
      brandOfLed: product.brandOfLed || "",
      luminousFlux: product.luminousFlux || "",
      mainMaterial: product.mainMaterial || "",
      cri: product.cri || "",
      beamAngle: product.beamAngle || "",
      workingTemperature: product.workingTemperature || "",
      fixtureDimmable: product.fixtureDimmable || "",
      electrical: product.electrical || "",
      powerFactor: product.powerFactor || "",
      colorTemperature: product.colorTemperature || "",
      ip: product.ip?.toString() || "",
      energySaving: product.energySaving || "",
      lifeTime: product.lifeTime || "",
    };

    const result: SpecificationsTable = {};

    const safeAssign = (key: string, value: string | undefined) => {
      if (value && value.trim() !== "") {
        result[key] = value;
      }
    };

    // Balcom-specific specifications
    safeAssign(
      locale === 'ar' ? 'المدخل' : 'Input',
      specs.input || fallbackSpecs.input
    );
    safeAssign(
      locale === 'ar' ? 'أقصى قوة كهربائية (w)' : 'Maximum wattage',
      specs.maximumWattage || fallbackSpecs.maximumWattage
    );
    safeAssign(
      locale === 'ar' ? 'علامة الليد التجارية' : 'Brand Of Led',
      specs.brandOfLed || fallbackSpecs.brandOfLed
    );
    safeAssign(
      locale === 'ar' ? 'الومن' : 'Luminous Flux',
      specs.luminousFlux || fallbackSpecs.luminousFlux
    );
    safeAssign(
      locale === 'ar' ? 'مادة التصنيع' : 'Main Material',
      specs.mainMaterial || fallbackSpecs.mainMaterial
    );
    safeAssign(
      locale === 'ar' ? 'مؤشر تجسيد الألوان' : 'CRI',
      specs.cri || fallbackSpecs.cri
    );
    safeAssign(
      locale === 'ar' ? 'زاوية الإضاءة°' : 'Beam Angle',
      specs.beamAngle || fallbackSpecs.beamAngle
    );
    safeAssign(
      locale === 'ar' ? 'درجة حرارة التشغيل' : 'Working Temperature',
      specs.workingTemperature || fallbackSpecs.workingTemperature
    );
    safeAssign(
      locale === 'ar' ? 'قابلية التعتيم' : 'Fixture Dimmable',
      specs.fixtureDimmable || fallbackSpecs.fixtureDimmable
    );
    safeAssign(
      locale === 'ar' ? 'الترانس' : 'Electrical',
      specs.electrical || fallbackSpecs.electrical
    );
    safeAssign(
      locale === 'ar' ? 'معامل القدرة' : 'Power Factor',
      specs.powerFactor || fallbackSpecs.powerFactor
    );
    safeAssign(
      locale === 'ar' ? 'درجة حرارة لون الاضاءة' : 'Color Temperature',
      specs.colorTemperature || fallbackSpecs.colorTemperature
    );
    safeAssign(
      locale === 'ar' ? 'درجة الحماية' : 'IP',
      specs.ip || fallbackSpecs.ip
    );
    safeAssign(
      locale === 'ar' ? 'توفير الطاقة' : 'Energy Saving',
      specs.energySaving || fallbackSpecs.energySaving
    );
    safeAssign(
      locale === 'ar' ? 'العمر الافتراضي' : 'Life Time',
      specs.lifeTime || fallbackSpecs.lifeTime
    );

    return result;
  };

  const specificationsTable = buildBalcomSpecificationsTable();
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
                chandelierLightingType=""
                hNumber={undefined}
                bulbChoices={product.bulbChoices ?? []}
                specGroups={product.specGroups}
                lightingTypeName={product.lightingtype?.translations?.[0]?.name ?? product.lightingtype?.name ?? undefined}
                configuration={configuration}
                sectionTypes={[product.sectionType]}
                sectionType={product.sectionType}
                maximumWattage={product.localizedSpecs?.maximumWattage || undefined}
                mainMaterial={product.localizedSpecs?.mainMaterial || product.mainMaterial || ""}
                beamAngle={product.localizedSpecs?.beamAngle || product.beamAngle || ""}
                spotlightType={product.spotlightType}
                luminousFlux={product.localizedSpecs?.luminousFlux || product.luminousFlux || ""}
                colorTemperature={product.localizedSpecs?.colorTemperature || product.colorTemperature || ""}
                lifeTime={product.localizedSpecs?.lifeTime || product.lifeTime || ""}
                energySaving={product.localizedSpecs?.energySaving || product.energySaving || ""}
                cri={product.localizedSpecs?.cri || product.cri || ""}
                brandOfLed={product.localizedSpecs?.brandOfLed || product.brandOfLed || ""}
                electrical={product.localizedSpecs?.electrical || product.electrical || ""}
                finish={product.localizedSpecs?.finish || product.finish || undefined}
                input={product.localizedSpecs?.input || product.input || undefined}
                lampBase={product.localizedSpecs?.lampBase || product.lampBase || undefined}
                baseIp={(product.productIp as never) ?? "IP20"}
                maxIP={product.maxIP ?? undefined}
                ip={(product.localizedSpecs?.ip as ProductIP) || product.productIp || ("IP20" as ProductIP)}
              />
            </div>

            <div className="space-y-12">
              <ProductSpecifications
                specificationsTable={specificationsTable}
                specGroups={product.specGroups}
                Brand={product.brand}
                chandelierLightingType={undefined}
                hNumber={undefined}
                sectionType={product.sectionType}
                locale={locale}
              />
              <ProductFeatures
                specificationsTable={specificationsTable}
                specs={specs}
                specNumbers={specNumbers}
              />
              {(specs.colorTemperature || specificationsTable["Color Temperature"]) && (
                <ColorTemperatureSection
                  specificationsTable={specificationsTable as any}
                  specs={specs}
                />
              )}
            </div>
          </div>
        </Container>
      </div>
    </motion.div>
  );
}