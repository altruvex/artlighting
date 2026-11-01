import "server-only";
import type { QuotationDocumentData } from "@repo/datasheet";
import ExcelJS from "exceljs";

const GOLD = "FFC49A2E";
const INK = "FF1A1A1A";
const GREY = "FF555555";
const BAR = "FFF0F0F0";

/** "0.1400" → "14%", without float noise like 14.000000000000002%. */
const pct = (rate: string) => `${Number((Number(rate) * 100).toFixed(2))}%`;

/**
 * The quotation as a working spreadsheet. Amounts are live formulas
 * (qty × price × (1 − disc), then the totals), so a customer's purchasing
 * team can change a quantity and see the total follow. Each formula also
 * carries the saved result, so the file shows the quoted figures even in a
 * viewer that does not calculate.
 */
export async function buildQuotationXlsx(data: QuotationDocumentData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Art Lighting";
  wb.created = new Date();
  const ws = wb.addWorksheet(data.number, {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 12 }],
  });

  ws.columns = [
    { key: "no", width: 5 },
    { key: "sku", width: 16 },
    { key: "item", width: 44 },
    { key: "qty", width: 8 },
    { key: "unit", width: 14 },
    { key: "disc", width: 9 },
    { key: "amount", width: 16 },
  ];
  const moneyFmt = `#,##0.00 "${data.currency}"`;

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "ART LIGHTING — QUOTATION";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: INK } };
  ws.getCell("A2").value = data.number;
  ws.getCell("A2").font = { bold: true, color: { argb: GOLD } };

  const meta: [string, string | Date][] = [
    ["Date", data.issueDate],
    ["Valid until", data.validUntil],
    ["Currency", data.currency],
  ];
  if (data.preparedBy) meta.push(["Prepared by", data.preparedBy]);
  meta.forEach(([label, value], i) => {
    const row = ws.getRow(1 + i);
    row.getCell(6).value = label;
    row.getCell(6).font = { color: { argb: GREY } };
    row.getCell(7).value = value;
    if (value instanceof Date) row.getCell(7).numFmt = "dd mmm yyyy";
    row.getCell(7).alignment = { horizontal: "right" };
  });

  const c = data.customer;
  const billTo = [
    c.companyName || c.name,
    c.companyName ? c.name : null,
    c.phone,
    c.email,
    c.address?.replace(/\r?\n/g, ", "),
    c.taxId ? `Tax ID ${c.taxId}` : null,
  ].filter((v): v is string => Boolean(v));
  ws.getCell("A5").value = "BILL TO";
  ws.getCell("A5").font = { bold: true, color: { argb: GOLD } };
  billTo.slice(0, 5).forEach((text, i) => {
    ws.getCell(`A${6 + i}`).value = text;
    if (i === 0) ws.getCell(`A${6 + i}`).font = { bold: true };
  });
  if (data.subject) {
    ws.getCell("E5").value = "REFERENCE";
    ws.getCell("E5").font = { bold: true, color: { argb: GOLD } };
    ws.getCell("E6").value = data.subject;
  }

  const headRow = 12;
  const head = ws.getRow(headRow);
  ["#", "SKU", "Item", "Qty", "Unit price", "Disc.", "Amount"].forEach((label, i) => {
    const cell = head.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: GREY } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAR } };
    cell.alignment = { horizontal: i >= 3 ? "right" : "left" };
  });

  data.lines.forEach((line, i) => {
    const r = headRow + 1 + i;
    const row = ws.getRow(r);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = line.sku;
    row.getCell(3).value = line.description ? `${line.name}\n${line.description}` : line.name;
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
    row.getCell(4).value = line.quantity;
    row.getCell(5).value = Number(line.unitPrice);
    row.getCell(5).numFmt = moneyFmt;
    row.getCell(6).value = Number(line.discountRate);
    row.getCell(6).numFmt = "0.##%";
    row.getCell(7).value = { formula: `ROUND(ROUND(D${r}*E${r},2)*(1-F${r}),2)`, result: Number(line.lineTotal) };
    row.getCell(7).numFmt = moneyFmt;
    row.getCell(7).font = { bold: true };
    row.alignment = { vertical: "top" };
  });

  const first = headRow + 1;
  const last = headRow + Math.max(1, data.lines.length);
  let r = last + 2;
  const total = (label: string, formula: string, result: string, opts: { bold?: boolean; gold?: boolean } = {}) => {
    const row = ws.getRow(r);
    row.getCell(6).value = label;
    row.getCell(6).font = { bold: opts.bold, color: { argb: GREY } };
    row.getCell(7).value = { formula, result: Number(result) };
    row.getCell(7).numFmt = moneyFmt;
    row.getCell(7).font = { bold: opts.bold, color: { argb: opts.gold ? GOLD : INK }, size: opts.gold ? 13 : 11 };
    return r++;
  };

  const subtotalRow = total("Subtotal", `SUM(G${first}:G${last})`, data.totals.subtotal);
  const discountRate = data.totals.discountRate;
  const discountRow = total(
    discountRate ? `Discount (${pct(discountRate)})` : "Discount",
    discountRate ? `ROUND(G${subtotalRow}*${discountRate},2)` : `MIN(${data.totals.discountTotal},G${subtotalRow})`,
    data.totals.discountTotal,
  );
  const taxRow = total(
    `VAT (${pct(data.totals.taxRate)})`,
    `ROUND((G${subtotalRow}-G${discountRow})*${data.totals.taxRate},2)`,
    data.totals.taxTotal,
  );
  total("TOTAL", `G${subtotalRow}-G${discountRow}+G${taxRow}`, data.totals.grandTotal, { bold: true, gold: true });

  if (data.terms) {
    r += 1;
    ws.getCell(`A${r}`).value = "TERMS & CONDITIONS";
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: GOLD } };
    for (const line of data.terms.split(/\r?\n/)) {
      r += 1;
      ws.mergeCells(`A${r}:G${r}`);
      ws.getCell(`A${r}`).value = line;
      ws.getCell(`A${r}`).alignment = { wrapText: true };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
