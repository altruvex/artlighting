"use client";

import { CarouselArrow } from "@/components/carousel-arrow";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Native scrolling with explicit controls for mouse and keyboard users. */
export function RailScroller({
  children,
  locale,
  label,
}: {
  children: ReactNode;
  locale: string;
  label: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const t = useTranslations("shop");
  const [edges, setEdges] = useState({ start: true, end: true });
  const rtl = locale === "ar";

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const update = () => {
      const position = Math.abs(list.scrollLeft);
      setEdges({
        start: position < 2,
        end: position + list.clientWidth >= list.scrollWidth - 2,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", update);
    };
  }, [children, locale]);

  const move = (step: number) => {
    const list = ref.current;
    if (!list) return;
    list.scrollBy({
      left: step * (rtl ? -1 : 1) * list.clientWidth * 0.85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10">
      <ul
        ref={ref}
        aria-label={label}
        className="product-rail flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 sm:gap-5"
      >
        {children}
      </ul>
      {!(edges.start && edges.end) && (
        <div className="mt-2 flex justify-end gap-2">
          <CarouselArrow
            rtl={rtl}
            direction="previous"
            label={t("previousProducts")}
            disabled={edges.start}
            onClick={() => move(-1)}
          />
          <CarouselArrow
            rtl={rtl}
            direction="next"
            label={t("nextProducts")}
            disabled={edges.end}
            onClick={() => move(1)}
          />
        </div>
      )}
    </div>
  );
}
