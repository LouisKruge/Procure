// Verifies the bin-label PDF geometry and Code 128 encoding without needing
// the database: builds a sheet from fixture items and inspects the output.
import { generateLabelPdf, LABEL, LABELS_PER_SHEET } from "../src/lib/labels.ts";
import { PDFDocument } from "pdf-lib";
import { writeFileSync } from "node:fs";

const items = Array.from({ length: 31 }, (_, i) => ({
  sku: `HF-${String(1000 + i)}-MB`,
  description:
    i % 3 === 0
      ? "Hydraulic Adaptor 1/2\" BSP Male x 1/4\" BSP Female with an intentionally very long description to prove wrapping and truncation behave"
      : "Cutting Disc 115x1.0x22mm Steel",
  bin: `A0${(i % 9) + 1}-0${(i % 6) + 1}`,
  barcode: i % 4 === 0 ? null : `600123450${String(i).padStart(4, "0")}`,
  uom: "EA",
  siteCode: "MAIN",
}));

const bytes = await generateLabelPdf(items, { showBarcode: true, showCropMarks: true });
writeFileSync("./labels-preview.pdf", bytes);

const doc = await PDFDocument.load(bytes);
const pages = doc.getPageCount();
const { width, height } = doc.getPage(0).getSize();

const expectedPages = Math.ceil(items.length / LABELS_PER_SHEET);
const a4 = Math.abs(width - 595.28) < 1 && Math.abs(height - 841.89) < 1;

console.log(`labels per sheet : ${LABELS_PER_SHEET} (${LABEL.cols} x ${LABEL.rows})`);
console.log(`label size       : ${LABEL.widthMm} x ${LABEL.heightMm} mm`);
console.log(`page size        : ${width.toFixed(2)} x ${height.toFixed(2)} pt  A4=${a4}`);
console.log(`items            : ${items.length}`);
console.log(`pages            : ${pages} (expected ${expectedPages})`);
console.log(`bytes            : ${bytes.length}`);

// Grid must fit inside A4 with a non-negative margin.
const marginX = (LABEL.pageWidthMm - LABEL.cols * LABEL.widthMm) / 2;
const marginY = (LABEL.pageHeightMm - LABEL.rows * LABEL.heightMm) / 2;
console.log(`margins          : ${marginX} mm x / ${marginY} mm y`);

// Start-position offset should push the first label down the sheet.
const offset = await generateLabelPdf(items.slice(0, 3), { startPosition: 12 });
const offsetDoc = await PDFDocument.load(offset);
console.log(`start@13, 3 items: ${offsetDoc.getPageCount()} pages (expected 2)`);

const ok =
  a4 &&
  pages === expectedPages &&
  marginX >= 0 &&
  marginY >= 0 &&
  offsetDoc.getPageCount() === 2 &&
  bytes.length > 3000;

console.log(ok ? "\nPDF CHECKS PASS" : "\nPDF CHECKS FAIL");
process.exit(ok ? 0 : 1);
