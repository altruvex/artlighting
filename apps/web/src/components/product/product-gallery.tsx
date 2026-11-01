"use client";

import { PLACEHOLDER_IMAGE } from "@/lib/product-images";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "./product-image";

/**
 * The product's photographs.
 *
 * It was react-responsive-carousel — its own stylesheet, next/legacy/image,
 * and `priority` on every slide, so a product with six photos asked the
 * browser to fetch all six before anything else on the page. Now the
 * browser's own horizontal scroll with snap points: a finger swipes it, a
 * trackpad pans it, and only the first photograph is fetched eagerly.
 *
 * The strip is laid out left to right in both languages. It holds no text,
 * and a fixed direction keeps "next" meaning the same photograph whichever
 * way the page reads; the arrow buttons still point the reader's way.
 */
export default function ProductGallery({ images: given, name }: { images: string[]; name: string }) {
  const images = given.length > 0 ? given : [PLACEHOLDER_IMAGE];
  const locale = useLocale();
  const ar = locale === "ar";
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Which slide is in view, read from the scroll itself rather than kept in
  // step by hand, so a swipe and a thumbnail click can never disagree.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || images.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: strip, threshold: 0.6 },
    );
    strip.querySelectorAll("[data-index]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [images.length]);

  const go = useCallback(
    (index: number) => {
      const strip = stripRef.current;
      if (!strip) return;
      const target = Math.max(0, Math.min(images.length - 1, index));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      strip.scrollTo({ left: target * strip.clientWidth, behavior: reduce ? "auto" : "smooth" });
    },
    [images.length],
  );

  const label = (index: number) =>
    ar ? `صورة ${(index + 1).toLocaleString("ar-EG")} من ${images.length.toLocaleString("ar-EG")}` : `Image ${index + 1} of ${images.length}`;

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-sm bg-muted">
        <div
          ref={stripRef}
          dir="ltr"
          aria-roledescription={ar ? "معرض صور" : "gallery"}
          aria-label={name}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              data-index={index}
              aria-label={label(index)}
              role="group"
              className="relative aspect-square w-full shrink-0 snap-center"
            >
              <ProductImage
                src={src}
                alt={index === 0 ? name : `${name} — ${label(index)}`}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                className="product-photo object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <span className="pointer-events-none absolute bottom-3 end-3 rounded-full bg-background/80 px-2.5 py-1 text-[length:var(--text-xs)] font-medium tabular-nums backdrop-blur">
              {ar
                ? `${(active + 1).toLocaleString("ar-EG")} / ${images.length.toLocaleString("ar-EG")}`
                : `${active + 1} / ${images.length}`}
            </span>
            {/* Pointer devices only: a phone has the swipe. */}
            <div dir="ltr" className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 justify-between [@media(hover:hover)]:flex">
              <GalleryArrow
                label={ar ? "الصورة السابقة" : "Previous image"}
                onClick={() => go(active - 1)}
                disabled={active === 0}
                side="start"
              />
              <GalleryArrow
                label={ar ? "الصورة التالية" : "Next image"}
                onClick={() => go(active + 1)}
                disabled={active === images.length - 1}
                side="end"
              />
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul dir="ltr" className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, index) => (
            <li key={`${src}-thumb-${index}`} className="shrink-0">
              <button
                type="button"
                onClick={() => go(index)}
                aria-label={label(index)}
                aria-current={active === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-sm border bg-muted transition-[border-color,opacity] duration-[var(--dur-hover)] ease-[var(--ease-out)] sm:size-18",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active === index ? "border-primary" : "border-border opacity-70 hover:opacity-100",
                )}
              >
                <ProductImage src={src} alt="" fill sizes="72px" className="product-photo object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryArrow({
  label,
  onClick,
  disabled,
  side,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  side: "start" | "end";
}) {
  // The strip is left-to-right, so "previous" is always the left arrow.
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pointer-events-auto grid size-10 place-items-center rounded-full border border-border bg-background/85 opacity-0 shadow-e1 backdrop-blur transition-[opacity,transform,background-color] duration-[var(--dur-hover)] ease-[var(--ease-out)] hover:bg-background group-hover:opacity-100 focus-visible:opacity-100 active:scale-95 disabled:invisible"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
