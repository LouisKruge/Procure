"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Label } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatQty } from "@/lib/utils";
import type { Site } from "@/lib/session";

/** Columns the importer understands. Everything except description is optional. */
const COLUMNS = [
  "group",
  "sku",
  "description",
  "type",
  "bin",
  "location",
  "qty",
  "price",
  "supplier",
  "uom",
  "min_qty",
  "order_qty",
] as const;

type Row = Record<string, string>;

/** Rows are sent in chunks so a 2,000-line sheet cannot time the request out. */
const CHUNK = 250;

/** Split a delimited line, honouring double quotes as produced by Excel. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function parse(text: string): { rows: Row[]; headers: string[]; error?: string } {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], headers: [], error: "That looks empty — expected a header row plus data." };
  }

  // Excel copy-paste gives tabs; a saved file gives commas.
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[^a-z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""),
  );

  if (!headers.includes("description") && !headers.includes("sku")) {
    return {
      rows: [],
      headers,
      error:
        "No 'description' or 'sku' column found. The first row must be the column names.",
    };
  }

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const row: Row = {};
    headers.forEach((h, i) => {
      if ((COLUMNS as readonly string[]).includes(h)) row[h] = cells[i] ?? "";
    });
    return row;
  });

  return { rows: rows.filter((r) => r.description || r.sku), headers };
}

export function StockImporter({
  sites,
  siteId,
}: {
  sites: Site[];
  siteId: string | null;
}) {
  const router = useRouter();
  const [site, setSite] = useState(siteId ?? sites[0]?.id ?? "");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [setQuantities, setSetQuantities] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<null | {
    created: number;
    updated: number;
    adjusted: number;
    skipped: number;
  }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load(raw: string) {
    const parsed = parse(raw);
    setError(parsed.error ?? null);
    setRows(parsed.rows);
    setHeaders(parsed.headers);
    setResult(null);
    if (!parsed.error) {
      toast.success(`${parsed.rows.length} rows read. Check the preview, then import.`);
    }
  }

  async function onFile(file: File) {
    const raw = await file.text();
    setText(raw.slice(0, 4000));
    load(raw);
  }

  async function run() {
    if (!site) return toast.error("Choose which site this stock belongs to.");
    if (rows.length === 0) return toast.error("Nothing to import.");

    setBusy(true);
    setProgress(0);
    const supabase = createClient();
    const totals = { created: 0, updated: 0, adjusted: 0, skipped: 0 };

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { data, error } = await supabase.rpc("import_stock_rows", {
        p_site_id: site,
        p_rows: chunk,
        p_adjust_quantities: setQuantities,
      });

      if (error) {
        setBusy(false);
        return toast.error(
          `Stopped after ${i} rows — ${friendlyError(error)}. Rows already imported are saved.`,
        );
      }

      const r = data as typeof totals;
      totals.created += r?.created ?? 0;
      totals.updated += r?.updated ?? 0;
      totals.adjusted += r?.adjusted ?? 0;
      totals.skipped += r?.skipped ?? 0;
      setProgress(Math.min(i + CHUNK, rows.length));
    }

    setBusy(false);
    setResult(totals);
    toast.success(
      `Imported ${totals.created} new and ${totals.updated} updated items.`,
    );
    router.refresh();
  }

  const unknown = headers.filter((h) => h && !(COLUMNS as readonly string[]).includes(h));

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Import into site</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Spreadsheet file (.csv)</Label>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp /> Choose file
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paste">…or paste straight from Excel</Label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => text.trim() && load(text)}
            rows={5}
            placeholder={"group,sku,description,type,bin,location,qty,price,supplier,uom,min_qty,order_qty"}
            className="w-full rounded-lg border-2 border-input bg-card p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            First row must be the column names. Recognised:{" "}
            <span className="font-mono">{COLUMNS.join(", ")}</span>. Only{" "}
            <span className="font-mono">description</span> or{" "}
            <span className="font-mono">sku</span> is required.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={setQuantities}
            onCheckedChange={(v) => setSetQuantities(Boolean(v))}
          />
          <span className="text-sm font-medium">
            Set quantities on hand to the sheet values
            <span className="block text-xs font-normal text-muted-foreground">
              Differences post as logged adjustments, so the change is traceable.
              Untick to load item details only and leave quantities alone.
            </span>
          </span>
        </label>
      </Card>

      {error ? (
        <p className="rounded-lg bg-out-subtle px-4 py-3 text-sm font-medium text-out">
          {error}
        </p>
      ) : null}

      {unknown.length > 0 ? (
        <p className="rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          Ignoring unrecognised column{unknown.length > 1 ? "s" : ""}:{" "}
          <span className="font-mono">{unknown.join(", ")}</span>
        </p>
      ) : null}

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <p className="font-semibold">
              Preview — {rows.length.toLocaleString()} rows
            </p>
            <Badge variant="secondary">showing first 8</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {COLUMNS.filter((c) => rows.some((r) => r[c])).map((c) => (
                    <th key={c} className="px-3 py-2 text-xs font-semibold uppercase">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    {COLUMNS.filter((c) => rows.some((x) => x[c])).map((c) => (
                      <td key={c} className="max-w-[16rem] truncate px-3 py-2">
                        {r[c] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card className="space-y-2 p-4">
          <p className="flex items-center gap-2 font-semibold text-ok">
            <CheckCircle2 className="size-5" /> Import complete
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="New items" value={result.created} />
            <Stat label="Updated" value={result.updated} />
            <Stat label="Quantities set" value={result.adjusted} />
            <Stat label="Skipped" value={result.skipped} />
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {rows.length > 0
              ? `${rows.length.toLocaleString()} rows ready`
              : "Choose a file or paste your sheet"}
          </p>
          {busy ? (
            <p className="tabular text-sm font-semibold">
              {formatQty(progress)} of {formatQty(rows.length)} imported…
            </p>
          ) : null}
        </div>
        <Button size="lg" onClick={run} disabled={busy || rows.length === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          Import stock
        </Button>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tabular text-xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
