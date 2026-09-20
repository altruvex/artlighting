import { constructMetadata } from "@/lib/metadata";
import { imageUrls, productImageSelect } from "@/lib/product-images";
import { serializeRate } from "@repo/money";
import { prisma } from "@repo/database";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrderWithRelations } from "../../(configure)/complete/complete";
import ThankYou from "./thank-you";

interface ThankYouProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

const Page = async ({ searchParams }: ThankYouProps) => {
  const { orderId } = await searchParams;

  if (!orderId || typeof orderId !== "string") {
    return notFound();
  }

  const locale = await getLocale();

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      configuration: true,
      product: {
        include: {
          specifications: {
            where: {
              language: locale,
            },
          },
          translations: {
            where: {
              language: locale,
            },
          },
          images: productImageSelect(),
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    return notFound();
  }

  const discount = serializeRate(order.configuration?.discount ?? 0);

  const localizedProductName =
    order.product.translations[0]?.name || order.product.productName;

  const localizedOrder = {
    ...order,
    productName: localizedProductName,
    product: {
      ...order.product,
      productName: localizedProductName,
      translations: order.product.translations,
      specifications: order.product.specifications,
      maximumWattage: order.product.specifications[0]?.maximumWattage,
      mainMaterial: order.product.specifications[0]?.mainMaterial,
      beamAngle: order.product.specifications[0]?.beamAngle,
      lampBase: order.product.specifications[0]?.lampBase,
      colorTemperature: order.product.specifications[0]?.colorTemperature,
      lifeTime: order.product.specifications[0]?.lifeTime,
      finish: order.product.specifications[0]?.finish,
      input: order.product.specifications[0]?.input,
      brandOfLed: order.product.specifications[0]?.brandOfLed,
      luminousFlux: order.product.specifications[0]?.luminousFlux,
      cri: order.product.specifications[0]?.cri,
      workingTemperature: order.product.specifications[0]?.workingTemperature,
      fixtureDimmable: order.product.specifications[0]?.fixtureDimmable,
      electrical: order.product.specifications[0]?.electrical,
      powerFactor: order.product.specifications[0]?.powerFactor,
      ip: order.product.specifications[0]?.ip,
      energySaving: order.product.specifications[0]?.energySaving,
      customSpecs: order.product.specifications[0]?.customSpecs,
    },
  };

  return (
    <ThankYou
      discount={discount}
      initialOrder={localizedOrder as unknown as OrderWithRelations}
    />
  );
};

export async function generateMetadata({
  searchParams,
}: ThankYouProps): Promise<Metadata> {
  const { orderId } = await searchParams;

  if (!orderId || typeof orderId !== "string") {
    return notFound();
  }

  const locale = await getLocale();

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId, 10) },
    include: {
      configuration: true,
      product: {
        include: {
          specifications: {
            where: {
              language: locale,
            },
          },
          translations: {
            where: {
              language: locale,
            },
          },
          images: productImageSelect(),
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    return notFound();
  }

  const productName =
    order.product.translations[0]?.name || order.product.productName;
  const customerName = order.shippingAddress?.fullName;

  let productImage: string = locale === "ar" ? "/logo-ar.png" : "/logo-en.png";
  const [firstImage] = imageUrls(order.product ?? {});
  if (firstImage) {
    productImage = firstImage;
  }
  const titles: Record<string, string> = {
    en: `Thank you, ${customerName}! Your order is confirmed`,
    ar: `شكرًا لك، ${customerName}! تم تأكيد طلبك`,
  };

  const descriptions: Record<string, string> = {
    en: `Thank you for ordering ${productName}. Your order #${order.id} has been successfully placed and is being processed.`,
    ar: `شكرًا لطلبك ${productName}. تم تسجيل طلبك رقم #${order.id} بنجاح وهو قيد المعالجة.`,
  };

  return constructMetadata({
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    image: productImage,
  });
}

export default Page;
