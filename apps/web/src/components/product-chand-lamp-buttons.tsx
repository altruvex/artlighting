"use client";

import { changeProductChandLamp } from "@/actions/product-chandLamp";
import { saveConfig, type SaveConfigArgs } from "@/components/action";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { money, type MoneyInput } from "@repo/money";
import { calculateLampPriceIncrease } from "@/lib/pricing-rules";
import type { ProductChandLamp } from "@repo/database";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PRODUCT_CHAND_LAMP_CONFIG: Record<ProductChandLamp, { priceIncreasePerLamp: number }> = {
  lamp9w: { priceIncreasePerLamp: 0 },
  lamp12w: { priceIncreasePerLamp: 20 },
};

interface ProductChandelierLampButtonsProps {
  productId: string;
  configId?: string;
  productChandLamp: ProductChandLamp;
  hNumber: number;
  /** Serialized money (see @repo/money): never a float. */
  basePrice: string;
  /** Rate, not percent: 0.13 = 13%. */
  discount?: string;
  priceIncrease?: string;
  onProductLampChange: (newProductLamp: ProductChandLamp, lampPriceIncrease: string) => void;
}

export default function ProductChandelierLampButtons({
  productId,
  configId,
  productChandLamp,
  hNumber,
  basePrice,
  priceIncrease = "0",
  onProductLampChange,
}: ProductChandelierLampButtonsProps) {
  const t = useTranslations("ProductChandLampButtons");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [activeProductLamp, setActiveProductLamp] = useState<ProductChandLamp>(productChandLamp);
  const [isUpdating, setIsUpdating] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lampPriceIncreaseFor = useCallback(
    (lampType: ProductChandLamp) => calculateLampPriceIncrease(hNumber, lampType),
    [hNumber]
  );

  const { mutate: changeLampMutation } = useMutation({
    mutationKey: ["change-product-chand-lamp"],
    mutationFn: changeProductChandLamp,
    onSuccess: () => toast.success(t("change-success")),
    onError: () => {
      toast.error(t("change-error"));
      setIsUpdating(false);
    },
  });

  const { mutate: saveConfigMutation, isPending: isSavingConfig } = useMutation({
    mutationKey: ["save-config-lamp", configId],
    mutationFn: saveConfig,
    onSuccess: () => setIsUpdating(false),
    onError: () => {
      toast.error(t("saving-error"));
      setIsUpdating(false);
    },
  });

  const saveConfigurationAsync = useCallback(
    (lampType: ProductChandLamp) => {
      if (!configId) return;
      const configData: SaveConfigArgs = { configId, productId, quantity: 1 };
      saveConfigMutation(configData);
    },
    [configId, productId, saveConfigMutation]
  );

  useEffect(() => {
    onProductLampChange(activeProductLamp, lampPriceIncreaseFor(activeProductLamp));
  }, [activeProductLamp, lampPriceIncreaseFor, onProductLampChange]);

  const handleLampChange = useCallback(
    (productLamp: ProductChandLamp) => {
      if (productLamp === activeProductLamp || isUpdating) return;

      setActiveProductLamp(productLamp);
      setIsUpdating(true);
      changeLampMutation({ productId, newProductLamp: productLamp });

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveConfigurationAsync(productLamp), 500);
    },
    [activeProductLamp, isUpdating, productId, changeLampMutation, saveConfigurationAsync]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-2">{t("chooseLampWattage")}</h3>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(PRODUCT_CHAND_LAMP_CONFIG) as [ProductChandLamp, { priceIncreasePerLamp: number }][]).map(
          ([productLamp, { priceIncreasePerLamp }]) => {
            const totalLampIncrease = priceIncreasePerLamp * hNumber;

            return (
              <Button
                key={productLamp}
                onClick={() => handleLampChange(productLamp)}
                disabled={isUpdating || isSavingConfig}
                variant={activeProductLamp === productLamp ? "default" : "outline"}
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-200",
                  activeProductLamp === productLamp
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-background hover:bg-secondary",
                  (isUpdating || isSavingConfig) && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex flex-row gap-2 justify-center items-end text-center">
                  <span className="font-medium">{t(productLamp)}</span>
                  {totalLampIncrease > 0 && (
                    <span className="opacity-70 whitespace-nowrap block font-medium max-w-xs">
                      +{formatNumber(Math.ceil(totalLampIncrease), isRTL ? "ar" : "en")}
                      {" "}({priceIncreasePerLamp} × {hNumber})
                    </span>
                  )}
                </div>
                {(isUpdating || isSavingConfig) && activeProductLamp === productLamp && (
                  <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                )}
              </Button>
            );
          }
        )}
      </div>
    </div>
  );
}