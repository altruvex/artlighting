"use client";

import Image, { type ImageProps } from "next/image";
import LegacyImage, { type ImageProps as LegacyImageProps } from "next/legacy/image";
import { useState } from "react";

export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholder.svg";

/**
 * A product image that falls back to the placeholder when the file is not
 * there.
 *
 * Not hypothetical: `mc1608-w1` is an active product whose
 * `/chandelier/MC1608/MC1608-W1.jpg` was never shipped, so its page rendered
 * a broken image. A missing asset should look like a missing asset, not like
 * a broken page.
 */
export function ProductImage({ src, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? PRODUCT_IMAGE_PLACEHOLDER : src;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      // next/image cannot optimise an SVG placeholder, and there is nothing
      // to optimise about it anyway.
      unoptimized={resolved === PRODUCT_IMAGE_PLACEHOLDER ? true : props.unoptimized}
    />
  );
}

/**
 * The two carousels still use `next/legacy/image` (fill + objectFit), which
 * the modern component does not accept. Same fallback, legacy props.
 */
export function LegacyProductImage({ src, alt, ...props }: LegacyImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? PRODUCT_IMAGE_PLACEHOLDER : src;

  return (
    <LegacyImage
      {...props}
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      unoptimized={resolved === PRODUCT_IMAGE_PLACEHOLDER ? true : props.unoptimized}
    />
  );
}
