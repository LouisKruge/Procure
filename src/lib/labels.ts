import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Print-ready linbin label sheets.
 *
 * Geometry matches the 38 x 88 mm linbin label stock: 2 across and 7 down
 * on A4, centred, with crop marks in the gutters so a guillotine cut lines
 * up. This replaces the standalone ReportLab script - same output, but the
 * data comes straight from the live item records.
 */

export const MM = 2.834645669291339; // points per millimetre

export const LABEL = {
  widthMm: 88,
  heightMm: 38,
  cols: 2,
  rows: 7,
  pageWidthMm: 210, // A4
  pageHeightMm: 297,
} as const;

export const LABELS_PER_SHEET = LABEL.cols * LABEL.rows;

export type LabelItem = {
  sku: string;
  description: string;
  bin: string | null;
  barcode: string | null;
  uom?: string | null;
  siteCode?: string | null;
};

/* ------------------------------------------------------------- Code 128 */

// Bar/space module widths for each Code 128 symbol value (0-106).
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes text as Code 128 subset B and returns the module widths, starting
 * with a bar and alternating. Characters outside the printable ASCII range
 * are dropped rather than throwing - a label with a slightly shortened code
 * is more use on a bin than no label at all.
 */
export function code128Modules(text: string): number[] {
  const chars = [...text].filter((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });

  if (chars.length === 0) return [];

  const values = chars.map((c) => c.charCodeAt(0) - 32);

  let checksum = START_B;
  values.forEach((v, i) => {
    checksum += v * (i + 1);
  });
  checksum %= 103;

  const symbols = [START_B, ...values, checksum, STOP];

  return symbols.flatMap((s) => [...CODE128_PATTERNS[s]].map(Number));
}

function drawBarcode(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const modules = code128Modules(text);
  if (modules.length === 0) return;

  const totalModules = modules.reduce((a, b) => a + b, 0);
  const moduleWidth = width / totalModules;

  let cursor = x;
  let isBar = true; // patterns always start with a bar

  for (const m of modules) {
    const w = m * moduleWidth;
    if (isBar) {
      page.drawRectangle({
        x: cursor,
        y,
        width: w,
        height,
        color: rgb(0, 0, 0),
      });
    }
    cursor += w;
    isBar = !isBar;
  }
}

/* ----------------------------------------------------------------- text */

/** Greedy wrap that also hard-truncates, so long descriptions cannot overflow. */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines && line) lines.push(line);

  if (lines.length === maxLines) {
    // Trim the final line with an ellipsis if there was more to say.
    const consumed = lines.join(" ");
    if (consumed.length < text.length) {
      let last = lines[maxLines - 1];
      while (
        last.length > 1 &&
        font.widthOfTextAtSize(`${last}…`, size) > maxWidth
      ) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }

  return lines;
}

/* --------------------------------------------------------------- layout */

function drawCropMarks(page: PDFPage, x: number, y: number, w: number, h: number) {
  const len = 3 * MM;
  const grey = rgb(0.65, 0.65, 0.65);
  const thickness = 0.4;

  const marks: [number, number, number, number][] = [
    // [x, y, width, height] - short ticks pointing outward at each corner
    [x - len, y, len, thickness],
    [x + w, y, len, thickness],
    [x - len, y + h, len, thickness],
    [x + w, y + h, len, thickness],
    [x, y - len, thickness, len],
    [x, y + h, thickness, len],
    [x + w, y - len, thickness, len],
    [x + w, y + h, thickness, len],
  ];

  for (const [mx, my, mw, mh] of marks) {
    page.drawRectangle({ x: mx, y: my, width: mw, height: mh, color: grey });
  }
}

function drawLabel(
  page: PDFPage,
  item: LabelItem,
  x: number,
  y: number,
  fonts: { bold: PDFFont; regular: PDFFont },
  opts: { showBarcode: boolean; showCropMarks: boolean },
) {
  const w = LABEL.widthMm * MM;
  const h = LABEL.heightMm * MM;
  const pad = 3 * MM;

  if (opts.showCropMarks) drawCropMarks(page, x, y, w, h);

  // Faint outline so a hand cut has something to follow too.
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.4,
  });

  const innerW = w - pad * 2;
  const top = y + h - pad;

  // Bin location sits top-right and is the biggest thing on the label -
  // it is what someone is scanning the rack for.
  const binSize = 15;
  const binText = item.bin ?? "";
  const binWidth = fonts.bold.widthOfTextAtSize(binText, binSize);

  // Both share a baseline one full cap-height below the top edge, so the
  // tallest glyph still sits inside the label.
  const headBaseline = top - binSize;

  page.drawText(binText, {
    x: x + w - pad - binWidth,
    y: headBaseline,
    size: binSize,
    font: fonts.bold,
    color: rgb(0, 0, 0),
  });

  // Stock code top-left, hard-truncated so it can never run into the bin.
  const skuSize = 13;
  const skuMaxWidth = innerW - binWidth - 3 * MM;
  let skuText = item.sku;
  while (
    skuText.length > 1 &&
    fonts.bold.widthOfTextAtSize(skuText, skuSize) > skuMaxWidth
  ) {
    skuText = skuText.slice(0, -1);
  }

  page.drawText(skuText, {
    x: x + pad,
    y: headBaseline,
    size: skuSize,
    font: fonts.bold,
    color: rgb(0, 0, 0),
  });

  // Description sits clear of the bin's baseline, wrapped to two lines.
  const descSize = 8;
  const descLines = wrap(item.description, fonts.regular, descSize, innerW, 2);
  descLines.forEach((line, i) => {
    page.drawText(line, {
      x: x + pad,
      y: headBaseline - 9 - i * (descSize + 2),
      size: descSize,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const code = item.barcode?.trim() || item.sku;

  if (opts.showBarcode) {
    const barHeight = 8 * MM;
    const barY = y + pad + 3.2 * MM;
    drawBarcode(page, code, x + pad, barY, innerW, barHeight);

    const codeSize = 6.5;
    const codeWidth = fonts.regular.widthOfTextAtSize(code, codeSize);
    page.drawText(code, {
      x: x + pad + (innerW - codeWidth) / 2,
      y: y + pad,
      size: codeSize,
      font: fonts.regular,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  // Site code in the bottom-right corner, when labelling for one site.
  if (item.siteCode) {
    const siteSize = 6.5;
    const siteWidth = fonts.bold.widthOfTextAtSize(item.siteCode, siteSize);
    page.drawText(item.siteCode, {
      x: x + w - pad - siteWidth,
      y: y + pad,
      size: siteSize,
      font: fonts.bold,
      color: rgb(0.45, 0.45, 0.45),
    });
  }
}

export async function generateLabelPdf(
  items: LabelItem[],
  options: { showBarcode?: boolean; showCropMarks?: boolean; startPosition?: number } = {},
): Promise<Uint8Array> {
  const showBarcode = options.showBarcode ?? true;
  const showCropMarks = options.showCropMarks ?? true;
  // Lets a part-used sheet be fed back through the printer.
  const startPosition = Math.max(0, Math.min(options.startPosition ?? 0, LABELS_PER_SHEET - 1));

  const pdf = await PDFDocument.create();
  pdf.setTitle("NEXUS Stock — bin labels");
  pdf.setCreator("NEXUS Stock");

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const pageW = LABEL.pageWidthMm * MM;
  const pageH = LABEL.pageHeightMm * MM;
  const labelW = LABEL.widthMm * MM;
  const labelH = LABEL.heightMm * MM;
  const marginX = (pageW - LABEL.cols * labelW) / 2;
  const marginY = (pageH - LABEL.rows * labelH) / 2;

  let page: PDFPage | null = null;

  for (let i = 0; i < items.length + startPosition; i++) {
    const slot = i % LABELS_PER_SHEET;

    if (slot === 0) page = pdf.addPage([pageW, pageH]);
    if (i < startPosition) continue;

    const col = slot % LABEL.cols;
    const row = Math.floor(slot / LABEL.cols);

    const x = marginX + col * labelW;
    // PDF origin is bottom-left; labels fill top-down.
    const y = pageH - marginY - (row + 1) * labelH;

    drawLabel(page!, items[i - startPosition], x, y, { bold, regular }, {
      showBarcode,
      showCropMarks,
    });
  }

  if (!page) pdf.addPage([pageW, pageH]); // never emit a zero-page PDF

  return pdf.save();
}
