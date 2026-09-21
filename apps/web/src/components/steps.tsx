"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const STEPS = ["preview", "confirm", "complete"] as const;

/**
 * Where the shopper is in the order, in three steps.
 *
 * Two things were wrong with it. Its labels and descriptions were English
 * strings in the component — the one path where a customer is typing an
 * address and agreeing to a price, in an interface that is otherwise
 * Arabic. And it fetched `/api/products/` on mount with an empty id, with
 * the state it set as the effect's own dependency; the request 404'd on
 * every checkout page and the value it wanted was already in the URL.
 */
const Steps = () => {
  const pathname = usePathname();
  const t = useTranslations("steps");

  const current = Math.max(
    0,
    STEPS.findIndex((step) => pathname.includes(`/${step}`)),
  );

  return (
    <nav aria-label={t("label")} className="mb-8 rounded-2xl border border-border bg-card/50 px-4 py-8 sm:px-6">
      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const isCurrent = index === current;
          const isDone = index < current;
          return (
            <li key={step} className="flex flex-col items-center text-center">
              <span
                aria-hidden
                className={cn(
                  "grid size-12 place-items-center rounded-full border text-[length:var(--text-base)] font-semibold tabular-nums transition-colors duration-[var(--dur-hover)]",
                  isCurrent && "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                  isDone && "border-primary/40 bg-primary/12 text-primary",
                  !isCurrent && !isDone && "border-border bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-5" /> : index + 1}
              </span>
              <span className="mt-3 flex items-center gap-2 font-semibold">
                {t(`${step}.name`)}
                <span className="sr-only">{isCurrent ? t("current") : isDone ? t("done") : ""}</span>
              </span>
              <span className="mt-1 max-w-xs text-[length:var(--text-sm)] text-muted-foreground">
                {t(`${step}.description`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Steps;
