"use client";

import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { Container } from "@/components/container";
import { CategoryItems } from "@/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { SupportedLanguage } from "@/types/products";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

interface CategoryProps {
  locale: SupportedLanguage
}
export default function CategoryContent({ locale }: CategoryProps) {
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const orderId = localStorage.getItem("currentOrderId");
    if (orderId) {
      setCurrentOrderId(orderId);
    }
  }, []);
  const handleContinueOrder = () => {
    if (currentOrderId) {
      router.push(`/complete?orderId=${currentOrderId}`);
    }
  };
  const variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.3,
      },
    },
  };
  const t = useTranslations("category")

  return (
    <motion.div initial="hidden" animate="visible" variants={variants}>
      <div>
        <Breadcrumb />
        <section className="Indoor-lighting py-11 md:py-15 lg:py-19">
          <Container>
            <h1 className="md:text-3xl sm:text-2xl text-xl mb-8 capitalize">{t('title')}</h1>
            {/* {currentOrderId && (
              <div className="mb-4">
                <Button onClick={handleContinueOrder}>
                  Continue with Current Order
                </Button>
              </div>
            )} */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
              {CategoryItems.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <Link href={category.href}>
                    <Image
                      src={category.image}
                      alt={t(`${category.id}-title`)}
                      width={475}
                      height={475}
                      className="rounded-[12px]"
                    />
                    <div className="card">
                      <h2 className="text-xl py-3 capitalize">{t(`${category.id}-title`)}</h2>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      </div>
    </motion.div >
  );
}
