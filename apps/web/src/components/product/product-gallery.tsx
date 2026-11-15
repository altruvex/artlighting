"use client";

import { PLACEHOLDER_IMAGE } from "@/lib/product-images";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductImage } from "./product-image";
import { CarouselArrow } from "@/components/carousel-arrow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/dialog";

/**
 * The product's photographs.
 *
 * It was react-responsive-carousel — its own stylesheet, next/legacy/image,
 * and `priority` on every slide, so a product with six photos asked the
 * browser to fetch all six before anything else on the page. Now the
 * browser's own horizontal scroll with snap points: a finger swipes it, a
 * trackpad pans it, and only the first photograph is fetched eagerly.
 *
 * Slides and controls follow the page direction. A pending arrow reflects
 * an image still loading, without adding artificial delays to cached photos.
 */
export default function ProductGallery({
  images: given,
  name,
}: {
  images: string[];
  name: string;
}) {
  const images = given.length > 0 ? given : [PLACEHOLDER_IMAGE];
  const locale = useLocale();
  const ar = locale === "ar";
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const [pending, setPending] = useState<{
    index: number;
    direction: "previous" | "next";
  } | null>(null);
  const imageReady = useCallback((index: number) => {
    setReady((current) =>
      current.has(index) ? current : new Set([...current, index]),
    );
    setPending((current) => (current?.index === index ? null : current));
  }, []);
  const readyCallbacks = useMemo(
    () =>
      Array.from(
        { length: images.length },
        (_, index) => () => imageReady(index),
      ),
    [images.length, imageReady],
  );

  // Which slide is in view, read from the scroll itself rather than kept in
  // step by hand, so a swipe and a thumbnail click can never disagree.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || images.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: strip, threshold: 0.6 },
    );
    strip
      .querySelectorAll("[data-index]")
      .forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [images.length]);

  const go = useCallback(
    (index: number) => {
      const strip = stripRef.current;
      if (!strip) return;
      const target = Math.max(0, Math.min(images.length - 1, index));
      if (!ready.has(target))
        setPending({
          index: target,
          direction: target > active ? "next" : "previous",
        });
      else setPending(null);
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      strip.scrollTo({
        left: (ar ? -1 : 1) * target * strip.clientWidth,
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [images.length, ar, active, ready],
  );

  const label = (index: number) =>
    ar
      ? `صورة ${(index + 1).toLocaleString("ar-EG")} من ${images.length.toLocaleString("ar-EG")}`
      : `Image ${index + 1} of ${images.length}`;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card">
        <div
          ref={stripRef}
          dir={ar ? "rtl" : "ltr"}
          aria-roledescription={ar ? "معرض صور" : "gallery"}
          aria-label={name}
          tabIndex={images.length > 1 ? 0 : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              go(active + ((event.key === "ArrowRight") !== ar ? 1 : -1));
            }
          }}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              data-index={index}
              aria-label={label(index)}
              role="group"
              className="relative aspect-[4/3] w-full shrink-0 snap-center md:aspect-square"
            >
              <ProductImage
                src={src}
                alt={index === 0 ? name : `${name} — ${label(index)}`}
                fill
                sizes="(min-width: 1536px) 740px, (min-width: 768px) 52vw, 100vw"
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                showLoadingIndicator
                onReady={readyCallbacks[index]}
                className="product-photo object-contain p-4 sm:p-6 lg:p-8"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label={ar ? "تكبير صورة المنتج" : "Enlarge product image"}
          className="absolute bottom-3 end-3 grid size-11 place-items-center rounded-md border border-input bg-background/95 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Maximize2 className="size-4" aria-hidden />
        </button>
      </div>

      {images.length > 1 && (
        <div
          className="flex items-center justify-between gap-3"
          dir={ar ? "rtl" : "ltr"}
        >
          <ul className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {images.map((src, index) => (
              <li key={`${src}-thumb-${index}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(index)}
                  aria-label={label(index)}
                  aria-current={active === index ? "true" : undefined}
                  className={cn(
                    "relative block size-14 overflow-hidden rounded-md border bg-muted transition-[border-color,opacity] duration-[var(--dur-hover)] ease-[var(--ease-out)] sm:size-16",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active === index
                      ? "border-primary"
                      : "border-border opacity-70 hover:opacity-100",
                  )}
                >
                  <ProductImage
                    src={src}
                    alt=""
                    fill
                    sizes="64px"
                    className="product-photo object-contain p-1"
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-1">
            <CarouselArrow
              rtl={ar}
              loading={
                pending?.direction === "previous" && !ready.has(pending.index)
              }
              direction="previous"
              label={ar ? "الصورة السابقة" : "Previous image"}
              onClick={() => go(active - 1)}
              disabled={active === 0}
            />
            <span
              aria-live="polite"
              aria-atomic="true"
              className="min-w-10 text-center text-xs tabular-nums text-muted-foreground"
            >
              <span className="sr-only">{ar ? "الصورة" : "Image"} </span>
              {ar
                ? `${(active + 1).toLocaleString("ar-EG")} / ${images.length.toLocaleString("ar-EG")}`
                : `${active + 1} / ${images.length}`}
            </span>
            <CarouselArrow
              rtl={ar}
              loading={
                pending?.direction === "next" && !ready.has(pending.index)
              }
              direction="next"
              label={ar ? "الصورة التالية" : "Next image"}
              onClick={() => go(active + 1)}
              disabled={active === images.length - 1}
            />
          </div>
        </div>
      )}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              <bdi>{name}</bdi>
            </DialogTitle>
            <DialogDescription>{label(active)}</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square max-h-[70dvh] w-full overflow-hidden rounded-md bg-muted">
            <ProductImage
              src={images[active]!}
              alt={`${name} — ${label(active)}`}
              fill
              sizes="(min-width: 1024px) 850px, 95vw"
              showLoadingIndicator
              className="product-photo object-contain p-4"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
