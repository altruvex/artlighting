"use client";

import { updateProductIP } from "@/actions/product-ip";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { Decimal, money, type MoneyInput, serializeMoney } from "@repo/money";
import type { ProductIP } from "@repo/database";
import { Droplets } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const PRODUCT_IP_LABEL_MAP = {
  IP20: {
    label: "IP 20",
    description: "Protected against solid objects over 12mm",
    increaseOnPricePercent: 0,
  },
  IP44: {
    label: "IP 44",
    description: "Protected against water splashes from all directions",
    increaseOnPricePercent: 0.02,
  },
  IP54: {
    label: "IP 54",
    description: "Protected against dust and water splashes",
    increaseOnPricePercent: 0.04,
  },
  IP65: {
    label: "IP 65",
    description: "Dust tight and protected against water jets",
    increaseOnPricePercent: 0.06,
  },
  IP68: {
    label: "IP 68",
    description: "Dust tight and protected against long periods of immersion",
    increaseOnPricePercent: 0.08,
  },
} satisfies Record<ProductIP, { label: string; description: string; increaseOnPricePercent: number }>;

const IP_NUMERIC_MAP = {
  IP20: 20,
  IP44: 44,
  IP54: 54,
  IP65: 65,
  IP68: 68,
} satisfies Record<ProductIP, number>;

interface ProductIPButtonsProps {
  configId: string;
  productIp: ProductIP;
  maxIP: number;
  /** Serialized money (see @repo/money): never a float. */
  basePrice: MoneyInput;
  /** Rate, not percent: 0.13 = 13%. */
  discount: MoneyInput;
  onProductIpChange: (newProductIp: ProductIP, priceIncrease: string) => void;
}

export default function ProductIPButtons({
  configId,
  productIp,
  basePrice,
  discount,
  maxIP,
  onProductIpChange,
}: ProductIPButtonsProps) {
  const [selectedIp, setSelectedIp] = useState<ProductIP>(productIp);
  const [isUpdating, setIsUpdating] = useState(false);
  const t = useTranslations("product-ip");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const calculatePriceIncrease = useCallback(
    (ip: ProductIP) => {
      const { increaseOnPricePercent } = PRODUCT_IP_LABEL_MAP[ip];
      // Decimal, rounded up to the piastre — the old Math.ceil rounded to
      // whole pounds and drifted from the amount the server stored.
      return serializeMoney(money(basePrice).times(increaseOnPricePercent).toDecimalPlaces(2, Decimal.ROUND_UP));
    },
    [basePrice]
  );

  useEffect(() => {
    const priceIncrease = calculatePriceIncrease(selectedIp);
    onProductIpChange(selectedIp, priceIncrease);
  }, [selectedIp, calculatePriceIncrease, onProductIpChange]);

  const handleIpChange = useCallback(
    async (newIp: ProductIP) => {
      if (newIp === selectedIp || isUpdating) return;
      setIsUpdating(true);
      try {
        await updateProductIP({ configId, newProductIp: newIp });
        setSelectedIp(newIp);
        toast.success(t("change-success"));
      } catch (error) {
        console.error("Failed to change IP rating:", error);
        toast.error(t("change-error"));
      } finally {
        setIsUpdating(false);
      }
    },
    [selectedIp, isUpdating, configId, t]
  );


  const baseNumericIP = IP_NUMERIC_MAP[productIp];


  const effectiveMaxIP = Math.max(baseNumericIP, maxIP);

  const availableEntries = (
    Object.entries(PRODUCT_IP_LABEL_MAP) as [
      ProductIP,
      { label: string; description: string; increaseOnPricePercent: number }
    ][]
  ).filter(([ip]) => {
    const numeric = IP_NUMERIC_MAP[ip];
    return numeric >= baseNumericIP && numeric <= effectiveMaxIP;
  });

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-2">{t("title")}</h3>
      <div className="grid sm:grid-cols-3 grid-cols-1 gap-2">
        {availableEntries.map(([ip, { label, description, increaseOnPricePercent }]) => {
          const displayedIncrease = calculatePriceIncrease(ip);

          return (
            <TooltipProvider key={ip}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleIpChange(ip)}
                    disabled={isUpdating}
                    variant={selectedIp === ip ? "default" : "outline"}
                    className={cn(
                      "flex items-center justify-center w-full rounded-full transition-all duration-200",
                      selectedIp === ip
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-background hover:bg-secondary",
                      isUpdating && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Droplets className="w-4 h-4 mr-1" />
                    <span className={cn("rtl:mr-1 ltr:ml-1")}>
                      {t(`ratings.${ip}.label`)}
                    </span>
                    {money(displayedIncrease).greaterThan(0) && (
                      <span className="ml-2 text-sm opacity-70">
                        +{formatNumber(money(displayedIncrease).toNumber(), isRTL ? "ar" : "en")}
                      </span>
                    )}
                    {isUpdating && selectedIp === ip && (
                      <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="block font-medium max-w-xs">
                  <p>{t(`ratings.${ip}.description`)}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {t("onlyAvailableRating")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}