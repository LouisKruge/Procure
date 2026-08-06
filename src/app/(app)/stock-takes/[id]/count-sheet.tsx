"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Tabs, TabsList, TabsTrigger } from "@/components/ui/misc";
import { ScanButton } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { cn, downloadCsv, formatMoney, formatQty, toCsv } from "@/lib/utils";

type Line = {
  line_id: string;
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  barcode: string | null;
  bin: string | null;
  expected_qty: number;
  counted_qty: number | null;
  unit_cost: number;
};

type Filter = "all" | "uncounted" | "variance";

export function CountSheet({
  takeId,
  reference,
  status,
  siteCode,
  canApprove,
  lines,
}: {
  takeId: string;
  reference: string;
  status: string;
  siteCode: string;
  canApprove: boolean;
  lines: Line[];
}) {
  const router = useRouter();
  const counting = status === "counting";

  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(
      lines.map((l) => [l.line_id, l.counted_qty === null ? "" : String(l.counted_qty)]),
    ),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const varianceOf = (l: Line) => {
    const raw = counts[l.line_id];
    if (raw === "" || raw === undefined) return null;
    return Number(raw) - l.expected_qty;
  };

  const stats = useMemo(() => {
    let counted = 0;
    let out = 0;
    let value = 0;
    for (const l of lines) {
      const v = varianceOf(l);
      if (v === null) continue;
      counted += 1;
      if (v !== 0) {
        out += 1;
        value += v * l.unit_cost;
      }
    }
    return { counted, out, value };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, lines]);

  const visible = lines.filter((l) => {
    if (filter === "uncounted") return counts[l.line_id] === "";
    if (filter === "variance") {
      const v = varianceOf(l);
      return v !== null && v !== 0;
    }
    return true;
  });

  /** Counts save per line as they are entered - a dropped tablet loses one line, not the session. */
  async function saveLine(line: Line, raw: string) {
    if (!counting) return;
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      toast.error("Counted quantity cannot be negative.");
      return;
    }

    setSaving(line.line_id);
    const { error } = await createClient()
      .from("stock_take_lines")
      .update({ counted_qty: value, counted_at: new Date().toISOString() })
      .eq("id", line.line_id);
    setSaving(null);

    if (error) toast.error(friendlyError(error));
  }

  function onScan(code: string) {
    const line = lines.find((l) => l.barcode === code || l.sku === code);
    if (!line) return toast.error(`${code} is not in this count.`);
    setFilter("all");
    setFlash(line.line_id);
    setTimeout(() => setFlash(null), 1200);
    requestAnimationFrame(() => {
      inputs.current[line.line_id]?.scrollIntoView({ block: "center" });
      inputs.current[line.line_id]?.focus();
      inputs.current[line.line_id]?.select();
    });
  }

  async function submitForApproval() {
    setBusy(true);
    const { error } = await createClient().rpc("submit_stock_take", {
      p_stock_take_id: takeId,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${reference} submitted — a supervisor must approve before it posts.`);
    router.refresh();
  }

  async function approve() {
    setBusy(true);
    const { error } = await createClient().rpc("approve_stock_take", {
      p_stock_take_id: takeId,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${reference} approved — variances posted as logged adjustments.`);
    router.refresh();
  }

  function exportVariance() {
    const rows = lines
      .map((l) => {
        const v = varianceOf(l);
        return {
          reference,
          site: siteCode,
          sku: l.sku,
          description: l.description,
          bin: l.bin ?? "",
          uom: l.uom,
          expected_qty: l.expected_qty,
          counted_qty: counts[l.line_id] === "" ? "" : counts[l.line_id],
          variance: v ?? "",
          unit_cost: l.unit_cost,
          variance_value: v === null ? "" : (v * l.unit_cost).toFixed(2),
        };
      })
      .filter((r) => r.variance !== "" && r.variance !== 0);

    if (rows.length === 0) return toast.info("No variances to export.");
    downloadCsv(`${reference}-variance.csv`, toCsv(rows));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {counting ? <ScanButton onScan={onScan} label="Scan to jump to a line" /> : null}

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All ({lines.length})</TabsTrigger>
            <TabsTrigger value="uncounted">
              Uncounted ({lines.length - stats.counted})
            </TabsTrigger>
            <TabsTrigger value="variance">Variance ({stats.out})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={exportVariance} className="ml-auto">
          <Download /> Variance CSV
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {filter === "uncounted"
                ? "Every line has been counted."
                : filter === "variance"
                  ? "No variances — everything counted matches."
                  : "No lines in this count."}
            </p>
          ) : (
            visible.map((line, i) => {
              const v = varianceOf(line);
              return (
                <div
                  key={line.line_id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 transition-colors",
                    flash === line.line_id ? "bg-ok-subtle" : "",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.sku}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {line.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bin {line.bin ?? "—"} · expected{" "}
                      <span className="tabular font-medium">
                        {formatQty(line.expected_qty)} {line.uom}
                      </span>
                    </p>
                    {v !== null && v !== 0 ? (
                      <Badge variant={v > 0 ? "ok" : "out"} className="mt-1">
                        {v > 0 ? "+" : "−"}
                        {formatQty(Math.abs(v))} · {formatMoney(v * line.unit_cost)}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="w-28 shrink-0">
                    <Label className="mb-1 block text-xs">
                      Counted
                      {saving === line.line_id ? (
                        <Loader2 className="ml-1 inline size-3 animate-spin" />
                      ) : null}
                    </Label>
                    <Input
                      ref={(el) => {
                        inputs.current[line.line_id] = el;
                      }}
                      type="number"
                      inputMode="decimal"
                      disabled={!counting}
                      value={counts[line.line_id] ?? ""}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [line.line_id]: e.target.value }))
                      }
                      onBlur={(e) => void saveLine(line, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveLine(line, (e.target as HTMLInputElement).value);
                          const next = visible[i + 1];
                          if (next) {
                            inputs.current[next.line_id]?.focus();
                            inputs.current[next.line_id]?.select();
                          }
                        }
                      }}
                      className={cn(
                        "tabular h-12 text-center text-lg font-bold",
                        v !== null && v !== 0
                          ? v > 0
                            ? "border-ok"
                            : "border-out"
                          : "",
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {stats.counted} of {lines.length} counted · {stats.out} out
          </p>
          <p
            className={cn(
              "tabular text-lg font-bold",
              stats.value < 0 ? "text-out" : stats.value > 0 ? "text-ok" : "",
            )}
          >
            {formatMoney(stats.value)} variance
          </p>
        </div>

        {counting ? (
          <Button size="lg" onClick={submitForApproval} disabled={busy || stats.counted === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
            Submit for approval
          </Button>
        ) : status === "pending_approval" ? (
          canApprove ? (
            <Button size="lg" onClick={approve} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Approve and post adjustments
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting on a supervisor to approve.
            </p>
          )
        ) : (
          <p className="flex items-center gap-2 text-sm text-ok">
            <CheckCircle2 className="size-4" />
            Adjustments posted
          </p>
        )}
      </Card>
    </div>
  );
}
