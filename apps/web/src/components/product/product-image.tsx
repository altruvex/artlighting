"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholder.svg";

/**
 * A product image that falls back to the placeholder when the file is not
 * there, and sits over a pulsing skeleton until it has actually decoded —
 * so a slow connection shows a loading shape instead of an empty
 * `bg-muted` square (or, worse, the previous slot's photo held over while
 * the next one is still in flight).
 *
 * Not hypothetical: `mc1608-w1` is an active product whose
 * `/chandelier/MC1608/MC1608-W1.jpg` was never shipped, so its page rendered
 * a broken image. A missing asset should look like a missing asset, not like
 * a broken page.
 *
 * The skeleton is an absolutely-positioned overlay, so it only makes sense
 * for `fill` usage — the only way this is called today (card, gallery,
 * thumbnails). A future non-fill caller just gets no skeleton, not a
 * broken layout.
 */
export function ProductImage({ src, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const resolved = failed || !src ? PRODUCT_IMAGE_PLACEHOLDER : src;

  // A cached image can render without ever firing `onLoad` once React
  // attaches the handler, which left the skeleton stuck on top of a
  // perfectly loaded photo. This catches that case on mount and whenever
  // the source changes.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [resolved]);

  return (
    <>
      {props.fill && (
        <div
          aria-hidden
          className={`absolute inset-0 bg-muted transition-opacity duration-[var(--dur-sheet)] ease-[var(--ease-out)] ${
            loaded ? "pointer-events-none opacity-0" : "animate-pulse opacity-100"
          }`}
        />
      )}
      <Image
        {...props}
        ref={imgRef}
        src={resolved}
        alt={alt}
        onLoad={(event) => {
          setLoaded(true);
          props.onLoad?.(event);
        }}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
        // next/image cannot optimise an SVG placeholder, and there is nothing
        // to optimise about it anyway.
        unoptimized={resolved === PRODUCT_IMAGE_PLACEHOLDER ? true : props.unoptimized}
      />
    </>
  );
}
