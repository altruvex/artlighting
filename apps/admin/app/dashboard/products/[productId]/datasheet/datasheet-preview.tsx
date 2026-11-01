"use client";

import type { DatasheetPrimitive, DatasheetRecording } from "@repo/datasheet/preview";
import { Jost } from "next/font/google";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Draws a recorded datasheet page: the exact boxes, lines and pictures the
 * PowerPoint receives, at the same inches. Nothing here lays anything out —
 * every position comes from the recording, which is what keeps the preview
 * honest to the file.
 */

const DPI = 96;
const px = (inches: number | string | undefined) => Number(inches ?? 0) * DPI;
const ptToPx = (pt: number | undefined) => ((pt ?? 12) * DPI) / 72;
// The sheet is set in Jost (packages/datasheet/fonts); the file names its
// three weights as faces, the browser reaches them as weights of one family.
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], display: "swap" });
const WEIGHT: Record<string, number> = { "Jost Light": 300, Jost: 400, "Jost Medium": 500 };

type TextOpts = Extract<DatasheetPrimitive, { type: "text" }>["opts"];
type Run = { text?: string; options?: { bold?: boolean; fontSize?: number; color?: string; breakLine?: boolean } };

function color(value: string | undefined) {
  return value ? `#${value}` : undefined;
}

function TextBox({ text, opts }: { text: string | Run[]; opts: TextOpts }) {
  const valign = opts.valign ?? "top";
  const style: CSSProperties = {
    position: "absolute",
    left: px(opts.x as number),
    top: px(opts.y as number),
    width: px(opts.w as number),
    height: px(opts.h as number),
    display: "flex",
    flexDirection: "column",
    justifyContent: valign === "middle" ? "center" : valign === "bottom" ? "flex-end" : "flex-start",
    textAlign: (opts.align as CSSProperties["textAlign"]) ?? "left",
    direction: opts.rtlMode ? "rtl" : "ltr",
    fontFamily: jost.style.fontFamily,
    fontSize: ptToPx(opts.fontSize),
    fontWeight: opts.bold ? 700 : (WEIGHT[opts.fontFace ?? "Jost"] ?? 400),
    color: color(opts.color as string),
    letterSpacing: opts.charSpacing ? ptToPx(opts.charSpacing) : undefined,
    // The file sets an exact line spacing; the preview uses the same one.
    lineHeight: opts.lineSpacing ? `${ptToPx(opts.lineSpacing)}px` : 1.2,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
  return (
    <div style={style}>
      <div>
        {typeof text === "string"
          ? text
          : text.map((run, i) => (
              <span
                key={i}
                style={{
                  fontWeight: run.options?.bold ? 700 : undefined,
                  fontSize: run.options?.fontSize ? ptToPx(run.options.fontSize) : undefined,
                  color: color(run.options?.color),
                }}
              >
                {run.text}
                {run.options?.breakLine && <br />}
              </span>
            ))}
      </div>
    </div>
  );
}

function Shape({ shape, opts }: Extract<DatasheetPrimitive, { type: "shape" }>) {
  const o = opts as { x: number; y: number; w: number; h: number; fill?: { color?: string }; line?: { color?: string; width?: number } };
  const lineW = Math.max(0.6, ptToPx(o.line?.width ?? 0.75));
  if (shape === "line") {
    const horizontal = px(o.h) === 0;
    return (
      <div
        style={{
          position: "absolute",
          left: px(o.x),
          top: px(o.y) - (horizontal ? lineW / 2 : 0),
          width: horizontal ? px(o.w) : 0,
          height: horizontal ? 0 : px(o.h),
          borderTop: horizontal ? `${lineW}px solid ${color(o.line?.color)}` : undefined,
          borderLeft: horizontal ? undefined : `${lineW}px solid ${color(o.line?.color)}`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: px(o.x),
        top: px(o.y),
        width: px(o.w),
        height: px(o.h),
        background: color(o.fill?.color),
        borderRadius: shape === "ellipse" ? "50%" : undefined,
      }}
    />
  );
}

function Picture({ opts }: Extract<DatasheetPrimitive, { type: "image" }>) {
  const o = opts as { x: number; y: number; w: number; h: number; data?: string; path?: string; sizing?: { type: string; w: number; h: number } };
  const src = o.data ?? o.path;
  if (!src) return null;
  const cover = o.sizing?.type === "cover";
  const box = cover ? { w: o.sizing!.w, h: o.sizing!.h } : { w: o.w, h: o.h };
  return (
    <div style={{ position: "absolute", left: px(o.x), top: px(o.y), width: px(box.w), height: px(box.h), overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: cover ? "cover" : "fill", display: "block" }} />
    </div>
  );
}

export function DatasheetPreview({ recording, label }: { recording: DatasheetRecording; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const width = px(recording.page.widthIn);
  const height = px(recording.page.heightIn);

  // Layout effect: the first paint already has the right scale, instead of
  // flashing at the default and jumping.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    setScale(el.clientWidth / width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={frame}
      role="img"
      aria-label={label}
      dir="ltr"
      className="relative w-full overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-black/10"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {recording.items.map((item, i) =>
          item.type === "text" ? (
            <TextBox key={i} text={item.text as string | Run[]} opts={item.opts} />
          ) : item.type === "shape" ? (
            <Shape key={i} {...item} />
          ) : (
            <Picture key={i} {...item} />
          ),
        )}
      </div>
    </div>
  );
}
