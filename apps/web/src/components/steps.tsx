"use client";

import { formatIndex } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const STEPS = ["preview", "confirm", "complete"] as const;

/**
 * Where the customer is in the order.
 *
 * Set the way the company pages number things: three columns under one
 * rule, each an index numeral and a name, the current step's rule drawn in
 * gold and the steps behind it in ink. It was three large circles with a
 * glow on the current one — the one place in checkout that looked like a
 * different site.
 */
const Steps = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("steps");
  const current = Math.max(0, STEPS.findIndex((step) => pathname.includes(`/${step}`)));

  // This nav lives in the shared layout and stays on screen between steps, so
  // Next's scroll-to-segment sees the layout's top as visible and leaves the
  // previous step's offset in place. Reset it here, but not on first mount or
  // on back/forward, which the browser restores itself.
  const lastPath = useRef(pathname);
  const fromHistory = useRef(false);
  useEffect(() => {
    const mark = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", mark);
    return () => window.removeEventListener("popstate", mark);
  }, []);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <nav aria-label={t("label")} className="mx-auto w-full max-w-screen-2xl px-4 pt-8 sm:px-6 lg:px-10">
      <ol className="grid grid-cols-3 gap-3 sm:gap-6">
        {STEPS.map((step, index) => {
          const isCurrent = index === current;
          const isDone = index < current;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "border-t-2 pt-3 transition-colors duration-[var(--dur-hover)]",
                isCurrent ? "border-primary" : isDone ? "border-foreground/60" : "border-border",
              )}
            >
              <span className={cn("index-numeral", isCurrent && "!text-primary")}>{formatIndex(index + 1, locale)}</span>
              <span className={cn("mt-1 block text-[length:var(--text-sm)] font-semibold", !isCurrent && !isDone && "text-muted-foreground")}>
                {t(`${step}.name`)}
                <span className="sr-only"> — {isCurrent ? t("current") : isDone ? t("done") : ""}</span>
              </span>
              <span className="mt-0.5 hidden text-[length:var(--text-xs)] text-muted-foreground sm:block">{t(`${step}.description`)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Steps;
