"use client";

import { changeProductColorTemp } from "@/actions/product-color-temp";
import { Button } from "@/components/ui/button";
import { PRODUCT_TEMP_LABEL_MAP } from "@/config/config";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/types/products";
import type { ProductColorTemp } from "@repo/database";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";



const SECTION_TITLE_MAP: Record<SupportedLanguage, string> = {
  en: "Color Temperature",
  ar: "درجة حرارة اللون",
};

interface ProductColorTempButtonsProps {
  productId: string;
  productColorTemp: ProductColorTemp;
  onColorTempChange: (newColorTemp: ProductColorTemp) => void;
}

export default function ProductColorTempButtons({
  productId,
  productColorTemp,
  onColorTempChange,
}: ProductColorTempButtonsProps) {
  const router = useRouter();
  const params = useParams() as { locale?: string };
  const locale = (params.locale as SupportedLanguage) || "en";

  const [activeTemp, setActiveTemp] =
    useState<ProductColorTemp>(productColorTemp);

  const { mutate } = useMutation({
    mutationKey: ["change-product-color-temp"],
    mutationFn: changeProductColorTemp,
    onSuccess: () => router.refresh(),
  });

  const handleColorTempChange = (colorTemp: ProductColorTemp) => {
    setActiveTemp(colorTemp);
    onColorTempChange(colorTemp);
    mutate({ productId, newColorTemp: colorTemp });
  };

  const isRTL = locale === "ar";

  return (
    <div className="space-y-2" dir={isRTL ? "rtl" : "ltr"}>
      <h3 className="text-lg font-semibold mb-2">
        {SECTION_TITLE_MAP[locale]}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(PRODUCT_TEMP_LABEL_MAP[locale]).map(([temp, label]) => (
          <Button
            key={temp}
            onClick={() => handleColorTempChange(temp as ProductColorTemp)}
            variant={activeTemp === temp ? "default" : "outline"}
            className={cn(
              "flex items-center justify-center p-0 m-0 rounded-full transition-all duration-200",
              activeTemp === temp
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-background hover:bg-secondary",
            )}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
