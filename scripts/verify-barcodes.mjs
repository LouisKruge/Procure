// Renders the Code 128 module widths to a bitmap and decodes it with an
// independent reader, proving the labels are actually scannable rather than
// merely looking like barcodes.
import { createCanvas } from "canvas";
import zxing from "@zxing/library";

const {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} = zxing;

import { code128Modules } from "../src/lib/labels.ts";

function renderToBitmap(text) {
  const modules = code128Modules(text);
  const total = modules.reduce((a, b) => a + b, 0);
  const scale = 3;
  const quiet = 20 * scale;
  const w = total * scale + quiet * 2;
  const h = 80;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";

  let cursor = quiet;
  let isBar = true;
  for (const m of modules) {
    const bw = m * scale;
    if (isBar) ctx.fillRect(cursor, 0, bw, h);
    cursor += bw;
    isBar = !isBar;
  }

  const { data } = ctx.getImageData(0, 0, w, h);
  const luminance = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    luminance[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) | 0;
  }
  return new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, w, h)));
}

const reader = new MultiFormatReader();
reader.setHints(
  new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]),
);

const cases = [
  "6001234500042",
  "HF-0804-MB",
  "TL-SPAN-SET",
  "AB-EMERY-P80",
  "WD-E6013-32",
  "BR-6205-2RS",
  "A01-03",
  "PN-VALVE-5",
];

let pass = 0;
for (const value of cases) {
  let got = null;
  try {
    got = reader.decode(renderToBitmap(value)).getText();
  } catch (e) {
    got = `<${e.constructor.name}>`;
  }
  const ok = got === value;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${value.padEnd(16)} -> ${got}`);
  reader.reset();
}

console.log(`\n${pass}/${cases.length} barcodes decoded correctly`);
process.exit(pass === cases.length ? 0 : 1);
