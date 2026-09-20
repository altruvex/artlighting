"use client";

import ColorTemperatureSection from "@/components/color-temperature-section";
import { specNumbersByKey, specsByKey } from "@/lib/specs-view";
import { parseLocalizedInt } from "@/lib/numbers";
import { multiplyMoney, serializeMoney, serializeRate } from "@repo/money"
import { Container } from "@/components/container";
import ProductCard from "@/components/product-card/product-card";
import ProductFeatures from "@/components/product-features";
import ProductImages from "@/components/product-images";
import ProductMainInfo from "@/components/product-main-Info";
import ProductSpecifications from "@/components/product-specifications-table";
import {
  LocalizedProductWithRelations,
  Order,
  ProductCardProps,
  ProductSpecification,
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

  const transformToBalcomProductCardProps = (relatedProduct: LocalizedProductWithRelations): ProductCardProps => {
    const specs = relatedProduct.localizedSpecs || {};

    const mockSpecification: ProductSpecification = {
      id: `spec-${relatedProduct.productId}`,
      productId: relatedProduct.productId,
      language: locale,
      input: specs.input || relatedProduct.input || null,
      maximumWattage: parseLocalizedInt(specs.maximumWattage) ?? relatedProduct.maximumWattage ?? undefined,
      brandOfLed: specs.brandOfLed || relatedProduct.brandOfLed || null,
      luminousFlux: specs.luminousFlux || relatedProduct.luminousFlux || null,
      mainMaterial: specs.mainMaterial || relatedProduct.mainMaterial || null,
      cri: specs.cri || relatedProduct.cri || null,
      beamAngle: specs.beamAngle || relatedProduct.beamAngle || null,
      workingTemperature: specs.workingTemperature || relatedProduct.workingTemperature || null,
      fixtureDimmable: specs.fixtureDimmable || relatedProduct.fixtureDimmable || null,
      electrical: specs.electrical || relatedProduct.electrical || null,
      powerFactor: specs.powerFactor || relatedProduct.powerFactor || null,
      colorTemperature: specs.colorTemperature || relatedProduct.colorTemperature || null,
      ip: specs.ip || relatedProduct.ip?.toString() || null,
      energySaving: specs.energySaving || relatedProduct.energySaving || null,
      lifeTime: specs.lifeTime || relatedProduct.lifeTime || null,
      finish: specs.finish || relatedProduct.finish || null,
      lampBase: specs.lampBase || relatedProduct.lampBase || null,
      bulb: null,
      customSpecs: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      productId: relatedProduct.productId,
      productName: relatedProduct.productName,
      price: serializeMoney(relatedProduct.price),
      discount: serializeRate(relatedProduct.discount ?? 0),
      productImages: relatedProduct.productImages,
      Brand: relatedProduct.brand,
      brand: relatedProduct.brand,
      chandelierLightingType: relatedProduct.chandelierLightingType || "",
      // The related card's description comes from these, the same way the
      // page above it builds its own; see @repo/catalog/describe.
      specGroups: relatedProduct.specGroups,
      lightingTypeName: relatedProduct.lightingtype?.translations?.[0]?.name ?? relatedProduct.lightingtype?.name ?? undefined,
      bulbChoices: relatedProduct.bulbChoices ?? [],
      sectionType: relatedProduct.sectionType,
      specification: mockSpecification,
      maximumWattage: parseLocalizedInt(specs.maximumWattage) ?? relatedProduct.maximumWattage ?? undefined,
      mainMaterial: specs.mainMaterial || (relatedProduct.mainMaterial ?? undefined),
      beamAngle: specs.beamAngle || (relatedProduct.beamAngle ?? undefined),
      spotlightType: relatedProduct.spotlightType,
      luminousFlux: specs.luminousFlux || (relatedProduct.luminousFlux ?? undefined),
      colorTemperature: specs.colorTemperature || (relatedProduct.colorTemperature ?? undefined),
      lifeTime: specs.lifeTime || (relatedProduct.lifeTime ?? undefined),
      energySaving: specs.energySaving || (relatedProduct.energySaving ?? undefined),
      cri: specs.cri || (relatedProduct.cri ?? undefined),
      brandOfLed: specs.brandOfLed || (relatedProduct.brandOfLed ?? undefined),
      electrical: specs.electrical || (relatedProduct.electrical ?? undefined),
      finish: specs.finish || (relatedProduct.finish ?? undefined),
      input: specs.input || (relatedProduct.input ?? undefined),
      lampBase: specs.lampBase || (relatedProduct.lampBase ?? undefined),
      ip: parseLocalizedInt(specs.ip) ?? relatedProduct.ip ?? undefined,
      hNumber: relatedProduct.hNumber ?? undefined,
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
              <section className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-semibold">
                    {locale === 'ar' ? 'منتجات بالكوم ذات صلة' : 'Related Balcom Products'}
                  </h2>
                  {relatedProducts.length > 0 ? (
                    <p className="text-muted-foreground text-lg">
                      {locale === 'ar'
                        ? 'منتجات تقنية قد تعجبك أيضاً'
                        : 'Technical lighting products you might also like'
                      }
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-lg">
                      {locale === 'ar'
                        ? 'لم يتم العثور على منتجات ذات صلة'
                        : 'No related products found'
                      }
                    </p>
                  )}
                </div>
                {relatedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mb-12">
                    {relatedProducts.map((relatedProduct) => (
                      <ProductCard
                        key={relatedProduct.productId}
                        product={transformToBalcomProductCardProps(relatedProduct) as any}
                        locale={locale}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </Container>
      </div>
    </motion.div>
  );
}