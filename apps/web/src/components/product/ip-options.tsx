"use client";

import { updateProductIP } from "@/actions/product-ip";
import { formatNumberWithConversion } from "@/lib/numbers";
import { availableIps, calculateIpPriceIncrease } from "@/lib/pricing-rules";
import { cn } from "@/lib/utils";
import { money } from "@repo/money";
import type { ProductIP } from "@repo/database";
import { Droplets } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChipSpinner, OptionGroup, optionChip } from "./option-group";

// Labels only: the price steps live in lib/pricing-rules, the same table
// the server charges from.
export const PRODUCT_IP_LABEL_MAP = {
  IP20: {
    label: "IP 20",
    description: "Protected against solid objects over 12mm",
  },
  IP44: {
    label: "IP 44",
    description: "Protected against water splashes from all directions",
  },
  IP54: {
    label: "IP 54",
    description: "Protected against dust and water splashes",
  },
  IP65: {
    label: "IP 65",
    description: "Dust tight and protected against water jets",
  },
  IP68: {
    label: "IP 68",
    description: "Dust tight and protected against long periods of immersion",
  },
} satisfies Record<ProductIP, { label: string; description: string }>;

interface ProductIPButtonsProps {
  /** The visitor's configuration id, created on first use. */
  ensureConfigId: () => Promise<string | null>;
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
  ensureConfigId,
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

  // The server's own formula (lib/pricing-rules): the step from the
  // fixture's rating, not from IP20, so the figure beside the chip is the
  // one the configuration stores.
  const calculatePriceIncrease = useCallback(
    (ip: ProductIP) => calculateIpPriceIncrease(basePrice, ip, baseIp),
    [basePrice, baseIp]
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
        const configId = await ensureConfigId();
        if (!configId) throw new Error("No configuration");
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
    [selectedIp, isUpdating, ensureConfigId, t]
  );


  // The same list the server accepts (lib/pricing-rules): from the
  // fixture's rating up to its maximum, with an unrecognised floor read as
  // IP20 so the list is never empty.
  const availableEntries = availableIps(baseIp, maxIP);

  // The rating's meaning under the chips, not in a tooltip: a tooltip
  // never opens on a phone, which is where most of these are chosen.
  return (
    <div className="space-y-2">
      <OptionGroup label={t("title")} selected={t(`ratings.${selectedIp}.label`)} className="grid-cols-2 sm:grid-cols-3">
        {availableEntries.map((ip) => {
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
              <Droplets className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span dir="ltr">{t(`ratings.${ip}.label`)}</span>
              {money(displayedIncrease).greaterThan(0) && (
                <span className="text-muted-foreground">
                  {/* With the currency, as the bulb options print theirs: "+90" beside
                      "+EGP 90" read as two different kinds of figure. */}
                  +{formatNumberWithConversion(money(displayedIncrease).toFixed(2), isRTL ? "ar" : "en")}
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
