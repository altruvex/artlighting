import type PptxGenJS from "pptxgenjs";
import type { DatasheetProductData, DatasheetTokens, ImageRef } from "../types";
import { drawSectionTitle } from "./_section-title";
import { imagePropsFor } from "./_image";

/** Gap between cells in the diagram grid. */
const CELL_GAP = 0.12;
/** At most this many drawings are placed; beyond it cells get too small to read a dimension from. */
const MAX_DIAGRAMS = 4;

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Chooses an arrangement from the number of drawings.
 *
 * The shapes are taken from the reference sheets rather than invented: one
 * drawing gets the whole area (BO-011-50W), and three become a tall elevation
 * beside two stacked detail views (BO-014-100W, where the pole's full height
 * needs a portrait cell and its base/arm details are square).
 */
function layoutCells(count: number, box: Cell): Cell[] {
  const { x, y, w, h } = box;
  const halfW = (w - CELL_GAP) / 2;
  const halfH = (h - CELL_GAP) / 2;

  if (count === 1) return [{ x, y, w, h }];

  if (count === 2) {
    // Side by side: most drawings are portrait, so two full-height columns
    // keep each one as large as possible.
    return [
      { x, y, w: halfW, h },
      { x: x + halfW + CELL_GAP, y, w: halfW, h },
    ];
  }

  if (count === 3) {
    // Tall elevation on the left, two stacked details on the right.
    const tallW = w * 0.44;
    const restW = w - tallW - CELL_GAP;
    return [
      { x, y, w: tallW, h },
      { x: x + tallW + CELL_GAP, y, w: restW, h: halfH },
      { x: x + tallW + CELL_GAP, y: y + halfH + CELL_GAP, w: restW, h: halfH },
    ];
  }

  return [
    { x, y, w: halfW, h: halfH },
    { x: x + halfW + CELL_GAP, y, w: halfW, h: halfH },
    { x, y: y + halfH + CELL_GAP, w: halfW, h: halfH },
    { x: x + halfW + CELL_GAP, y: y + halfH + CELL_GAP, w: halfW, h: halfH },
  ];
}

/**
 * Left column, bottom: DIMENSIONS title + the product's technical drawings.
 *
 * Skipped entirely when there are none — a heading and rule over empty space
 * reads as a broken render rather than an unfilled field. Every drawing is
 * placed with `contain`, so a portrait pole and a square base detail both
 * keep their true proportions inside whatever cell they are given.
 */
export function drawDimensions(
  slide: PptxGenJS.Slide,
  tokens: DatasheetTokens,
  data: DatasheetProductData,
  startY: number
): number {
  const diagrams: ImageRef[] = (data.dimensionDiagrams ?? []).slice(0, MAX_DIAGRAMS);
  if (diagrams.length === 0) return startY;

  const { layout, page } = tokens;

  const contentY = drawSectionTitle(slide, tokens, {
    x: layout.leftColX,
    y: startY,
    width: layout.leftColWidth,
    title: "Dimensions",
  });

  // Fill everything left between the heading and the footer bar.
  const available = page.heightIn - layout.footerBarHeight - layout.blockGap - contentY;
  if (available <= 0.4) return contentY;

  const cells = layoutCells(diagrams.length, {
    x: layout.leftColX,
    y: contentY,
    w: layout.leftColWidth,
    h: available,
  });

  diagrams.forEach((diagram, i) => {
    const cell = cells[i];
    if (!cell) return;
    slide.addImage({
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      sizing: { type: "contain", w: cell.w, h: cell.h },
      ...imagePropsFor(diagram),
    });
  });

  return contentY + available;
}
