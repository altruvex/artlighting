import type PptxGenJS from "pptxgenjs";
import type { ImageRef } from "../types";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Maps our ImageRef union onto pptxgenjs's own path/data union. */
export function imagePropsFor(ref: ImageRef): { path?: string; data?: string } {
  return ref.kind === "path" ? { path: ref.path } : { data: ref.dataUri };
}

/**
 * Pixel dimensions read straight from a data URI's header (PNG, JPEG, WebP).
 *
 * pptxgenjs cannot fit an image without knowing its own proportions — its
 * `contain` sizing silently stretches when handed the box as the image size —
 * so the ratio is taken from the bytes. Returns null when the format is not
 * recognised; the caller then fills the box as given.
 */
export function imageDimensions(ref: ImageRef): { w: number; h: number } | null {
  if (ref.width && ref.height) return { w: ref.width, h: ref.height };
  if (ref.kind !== "data") return null;
  const comma = ref.dataUri.indexOf(",");
  if (comma < 0) return null;
  // The headers sit in the first few KB; decoding the whole photo is wasted work.
  const buf = Buffer.from(ref.dataUri.slice(comma + 1, comma + 1 + 65536), "base64");

  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1]!;
      // SOF0–SOF15 carry the frame size; C4 (DHT), C8 (JPG) and CC (DAC) do not.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }

  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
    }
  }
  return null;
}

/**
 * Places an image inside a box without distorting it.
 *   contain — the whole image, centred, letterboxed by the page itself;
 *   cover   — fills the box, cropping the overflow (the lifestyle photo).
 */
export function placeImage(
  slide: PptxGenJS.Slide,
  ref: ImageRef,
  box: Box,
  mode: "contain" | "cover" = "contain",
  /** Horizontal placement of a contained image: centred, or flush to the box's start. */
  anchor: "center" | "start" = "center"
): void {
  const dims = imageDimensions(ref);
  if (!dims || dims.w <= 0 || dims.h <= 0) {
    slide.addImage({ ...box, ...imagePropsFor(ref) });
    return;
  }

  const imageRatio = dims.w / dims.h;
  const boxRatio = box.w / box.h;

  if (mode === "contain") {
    const w = imageRatio > boxRatio ? box.w : box.h * imageRatio;
    const h = imageRatio > boxRatio ? box.w / imageRatio : box.h;
    slide.addImage({
      x: anchor === "start" ? box.x : box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
      w,
      h,
      ...imagePropsFor(ref),
    });
    return;
  }

  // pptxgenjs crops for `cover` from the image's own size (w/h) into the box.
  const w = imageRatio > boxRatio ? box.h * imageRatio : box.w;
  const h = imageRatio > boxRatio ? box.h : box.w / imageRatio;
  slide.addImage({
    x: box.x,
    y: box.y,
    w,
    h,
    sizing: { type: "cover", w: box.w, h: box.h },
    ...imagePropsFor(ref),
  });
}
