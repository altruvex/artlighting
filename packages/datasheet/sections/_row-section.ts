import type PptxGenJS from "pptxgenjs";
import type { DatasheetTokens, LabelValueRow } from "../types";
import { drawSectionTitle, sectionTitleHeight } from "./_section-title";
import { estimateLines, estimateTextWidthIn, lineHeightIn } from "./_measure";

const LEADER_DOT_COUNT = 8;
const LEADER_DOT_SIZE = 0.028;
const LEADER_DOT_PITCH = 0.068;
const LEADER_DOT_SPAN = LEADER_DOT_COUNT * LEADER_DOT_PITCH;
/** Where the dot cluster sits for a short label, matching the reference sheets. */
const LEADER_DOT_MIN_OFFSET = 1.465;
const LEADER_DOT_LABEL_GAP = 0.1;

export interface RowSectionArgs {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: LabelValueRow[];
}

/**
 * Per-row heights, derived once and used by BOTH the measure and draw paths.
 *
 * Sharing this is the point: the right column auto-fits by measuring itself
 * before drawing, and if the two used different arithmetic the fit would be
 * computed against a layout that never gets rendered.
 */
function rowHeights(tokens: DatasheetTokens, rows: LabelValueRow[], width: number): number[] {
  const { layout, sizes } = tokens;
  const valueColWidth = width - layout.labelColWidth;
  const lh = lineHeightIn(sizes.value);

  return rows.map((row) => {
    const lines = estimateLines(row.value, valueColWidth, sizes.value);
    return Math.max(layout.rowHeight, lines * lh + 0.05);
  });
}

/** Height this section will occupy, including its trailing gap. Returns 0 for an empty section. */
export function measureRowSection(
  tokens: DatasheetTokens,
  args: Pick<RowSectionArgs, "rows" | "width">
): number {
  if (args.rows.length === 0) return 0;
  const heights = rowHeights(tokens, args.rows, args.width);
  return (
    sectionTitleHeight(tokens) +
    heights.reduce((a, b) => a + b, 0) +
    tokens.layout.sectionGap
  );
}

/**
 * Renders a titled block of label/value rows joined by a dotted leader — the
 * shared template behind SPECIFICATIONS, LAMP DATA, CONTROL UNIT and any
 * custom block such as BASE SPECIFICATION.
 *
 * Returns the y immediately below the section, so a caller can stack an
 * arbitrary number of them. An empty section returns `y` unchanged and so
 * costs no vertical space at all.
 */
export function drawRowSection(
  slide: PptxGenJS.Slide,
  tokens: DatasheetTokens,
  args: RowSectionArgs
): number {
  const { x, y, width, title, rows } = args;
  if (rows.length === 0) return y;

  const { layout, colors, fonts, sizes } = tokens;
  const contentY = drawSectionTitle(slide, tokens, { x, y, width, title });
  const valueColX = x + layout.labelColWidth;
  const valueColWidth = width - layout.labelColWidth;
  const heights = rowHeights(tokens, rows, width);

  let rowY = contentY;
  rows.forEach((row, i) => {
    const rowHeight = heights[i]!;

    slide.addText(row.label, {
      x,
      y: rowY,
      w: layout.labelColWidth,
      h: rowHeight,
      fontFace: fonts.family,
      fontSize: sizes.label,
      color: colors.labelGray,
      align: "left",
      valign: "top",
    });

    // The dot cluster starts after the label so a long one ("Working
    // Temperature") is never overlapped by its own leader.
    const maxDotStart = layout.labelColWidth - LEADER_DOT_SPAN;
    const dotStart = Math.min(
      maxDotStart,
      Math.max(
        LEADER_DOT_MIN_OFFSET,
        estimateTextWidthIn(row.label, sizes.label) + LEADER_DOT_LABEL_GAP
      )
    );

    for (let d = 0; d < LEADER_DOT_COUNT; d++) {
      slide.addShape("rect", {
        x: x + dotStart + d * LEADER_DOT_PITCH,
        y: rowY + layout.rowHeight / 2 - LEADER_DOT_SIZE / 2,
        w: LEADER_DOT_SIZE,
        h: LEADER_DOT_SIZE,
        fill: { color: colors.dottedLeader },
        line: { color: colors.dottedLeader, width: 0 },
      });
    }

    slide.addText(row.value, {
      x: valueColX,
      y: rowY,
      w: valueColWidth,
      h: rowHeight,
      fontFace: fonts.family,
      fontSize: sizes.value,
      color: row.highlight ? colors.accentGold : colors.ink,
      bold: row.highlight ?? false,
      align: "left",
      valign: "top",
      wrap: true,
    });

    rowY += rowHeight;
  });

  return rowY + layout.sectionGap;
}
