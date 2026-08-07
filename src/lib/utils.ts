import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Number formatting is done by hand rather than through Intl.
 *
 * Intl resolves en-ZA differently under Node than in the browser - Node's
 * ICU groups with a non-breaking space, Chrome with a comma - so every
 * server-rendered money value mismatched on hydration. Doing it explicitly
 * costs a few lines and makes the output identical everywhere.
 */
function group(intPart: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatMoney(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const negative = safe < 0;
  const [whole, decimals] = Math.abs(safe).toFixed(2).split(".");
  return `${negative ? "−" : ""}R ${group(whole)}.${decimals}`;
}

/**
 * Quantities are numeric(18,4) in the database but almost always whole
 * units on the floor - only show decimals when they actually carry meaning.
 */
export function formatQty(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";

  const negative = n < 0;
  const abs = Math.abs(n);
  const rounded = Number.isInteger(abs) ? String(abs) : abs.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, decimals] = rounded.split(".");
  return `${negative ? "−" : ""}${group(whole)}${decimals ? `.${decimals}` : ""}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDays(value: string | Date | null | undefined) {
  if (!value) return "never";
  const d = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows
    .map((row) => cols.map((c) => csvEscape(row[c])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
