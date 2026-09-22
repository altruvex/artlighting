"use client";

import { updateProductIP } from "@/actions/product-ip";
import { formatNumber } from "@/lib/numbers";
import { Decimal, money, type MoneyInput, serializeMoney } from "@repo/money";
import type { ProductIP } from "@repo/database";
import { Droplets } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChipSpinner, OptionGroup, optionChip } from "./option-group";

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
  /**
   * The rating the fixture is built to — the floor. Separate from the
   * selection on purpose: taking the floor from whatever is currently
   * selected made every upgrade permanent, because picking IP65 removed
   * IP20 and IP44 from the list and left no way back down.
   */
  baseIp: ProductIP;
  productIp: ProductIP;
  maxIP: number;
  /** Serialized money (see @repo/money): never a float. */
  basePrice: string;
  /** Rate, not percent: 0.13 = 13%. */
  discount: string;
  onProductIpChange: (newProductIp: ProductIP, priceIncrease: string) => void;
}

export default function ProductIPButtons({
  configId,
  baseIp,
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
        // updateProductIP reports failure by returning it, not by throwing —
        // a thrown error loses its message to an opaque digest in a
        // production build. Awaiting it without reading the result meant the
        // catch never ran and every attempt toasted success, including the
        // ones that saved nothing.
        const result = await updateProductIP({ configId, newProductIp: newIp });
        if (!result.success) {
          console.error("Failed to change IP rating:", result.error);
          toast.error(t("change-error"));
          return;
        }
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


  // The legacy spec column stores "20", not "IP20", and has been passed in
  // here before. An unrecognised floor must not empty the list — that takes
  // the choice away entirely.
  const baseNumericIP = IP_NUMERIC_MAP[baseIp] ?? IP_NUMERIC_MAP.IP20;


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

  // The rating's meaning under the chips, not in a tooltip: a tooltip
  // never opens on a phone, which is where most of these are chosen.
  return (
    <div className="space-y-2">
      <OptionGroup label={t("title")} selected={t(`ratings.${selectedIp}.label`)} className="grid-cols-2 sm:grid-cols-3">
        {availableEntries.map(([ip]) => {
          const displayedIncrease = calculatePriceIncrease(ip);
          const isActive = selectedIp === ip;
          return (
            <button
              key={ip}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleIpChange(ip)}
              disabled={isUpdating}
              className={optionChip(isActive)}
            >
              <Droplets className="size-4 shrink-0 text-primary" aria-hidden />
              <span dir="ltr">{t(`ratings.${ip}.label`)}</span>
              {money(displayedIncrease).greaterThan(0) && (
                <span className="text-muted-foreground">
                  +{formatNumber(money(displayedIncrease).toNumber(), isRTL ? "ar" : "en")}
                </span>
              )}
              {isUpdating && isActive && <ChipSpinner />}
            </button>
          );
        })}
      </OptionGroup>
      <p className="text-[length:var(--text-xs)] leading-relaxed text-muted-foreground">
        {t(`ratings.${selectedIp}.description`)}
      </p>
    </div>
  );
}
