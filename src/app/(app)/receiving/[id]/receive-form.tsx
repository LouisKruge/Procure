"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/misc";
import { ScanButton } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { cn, formatMoney, formatQty } from "@/lib/utils";

type Line = {
  line_id: string;
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  barcode: string | null;
  bin: string | null;
  qty_ordered: number;
  qty_received: number;
  unit_price: number;
};

/**
 * Receiving entry. Optimised for a person with a scanner in one hand:
 * scanning a line's barcode fills in the full outstanding quantity and
 * moves on, and Enter walks down the lines without touching the mouse.
 */
export function ReceiveForm({
  poId,
  poNumber,
  lines,
}: {
  poId: string;
  poNumber: string;
  lines: Line[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const outstanding = (l: Line) => l.qty_ordered - l.qty_received;

  const totals = useMemo(() => {
    let units = 0;
    let value = 0;
    for (const l of lines) {
      const q = Number(qty[l.line_id] ?? 0);
      if (!q) continue;
      units += q;
      value += q * Number(price[l.line_id] ?? l.unit_price);
    }
    return { units, value };
  }, [qty, price, lines]);

  function receiveAll() {
    const next: Record<string, string> = {};
    for (const l of lines) {
      const o = outstanding(l);
      if (o > 0) next[l.line_id] = String(o);
    }
    setQty(next);
  }

  function onScan(code: string) {
    const line = lines.find((l) => l.barcode === code || l.sku === code);
    if (!line) {
      toast.error(`${code} is not on ${poNumber}.`);
      return;
    }
    const o = outstanding(line);
    if (o <= 0) {
      toast.info(`${line.sku} is already fully received.`);
      return;
    }
    setQty((q) => ({ ...q, [line.line_id]: String(o) }));
    setFlash(line.line_id);
    setTimeout(() => setFlash(null), 1200);
    inputs.current[line.line_id]?.focus();
    inputs.current[line.line_id]?.select();
  }

  function focusNext(index: number) {
    const next = lines[index + 1];
    if (next) {
      inputs.current[next.line_id]?.focus();
      inputs.current[next.line_id]?.select();
    }
  }

  async function submit() {
    const payload = lines
      .map((l) => ({
        line_id: l.line_id,
        qty: Number(qty[l.line_id] ?? 0),
        unit_price:
          price[l.line_id] === undefined || price[l.line_id] === ""
            ? l.unit_price
            : Number(price[l.line_id]),
      }))
      .filter((l) => l.qty > 0);

    if (payload.length === 0) {
      toast.error("Enter a quantity on at least one line.");
      return;
    }

    const over = payload.find((p) => {
      const line = lines.find((l) => l.line_id === p.line_id)!;
      return p.qty > outstanding(line);
    });
    if (over) {
      const line = lines.find((l) => l.line_id === over.line_id)!;
      toast.error(
        `${line.sku}: only ${formatQty(outstanding(line))} ${line.uom} outstanding.`,
      );
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("receive_purchase_order", {
      p_po_id: poId,
      p_lines: payload,
      p_notes: note.trim() || undefined,
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success(
      `Booked in ${formatQty(totals.units)} units against ${poNumber}. Stock and costs updated.`,
    );
    setQty({});
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ScanButton onScan={onScan} label="Scan to receive" />
        <Button variant="outline" onClick={receiveAll}>
          <Check /> Receive everything outstanding
        </Button>
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <ScanLine className="size-4" />
          Scanning a line fills its outstanding quantity
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {lines.map((line, i) => {
            const o = outstanding(line);
            const done = o <= 0;
            return (
              <div
                key={line.line_id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-3 py-3 transition-colors sm:flex-nowrap",
                  done ? "opacity-60" : "",
                  flash === line.line_id ? "bg-ok-subtle" : "",
                )}
              >
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="truncate font-semibold">{line.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {line.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bin {line.bin ?? "—"} · ordered {formatQty(line.qty_ordered)} ·
                    received {formatQty(line.qty_received)} ·{" "}
                    {done ? (
                      <span className="font-medium text-ok">complete</span>
                    ) : (
                      <span className="font-medium text-low">
                        {formatQty(o)} outstanding
                      </span>
                    )}
                  </p>
                </div>

                <div className="w-28 shrink-0">
                  <Label className="mb-1 block text-xs">Receiving</Label>
                  <Input
                    ref={(el) => {
                      inputs.current[line.line_id] = el;
                    }}
                    type="number"
                    inputMode="decimal"
                    disabled={done}
                    value={qty[line.line_id] ?? ""}
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [line.line_id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusNext(i);
                      }
                    }}
                    placeholder="0"
                    className="tabular h-12 text-center text-lg font-bold"
                  />
                </div>

                <div className="w-28 shrink-0">
                  <Label className="mb-1 block text-xs">Unit price</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    disabled={done}
                    value={price[line.line_id] ?? ""}
                    onChange={(e) =>
                      setPrice((p) => ({ ...p, [line.line_id]: e.target.value }))
                    }
                    placeholder={String(line.unit_price)}
                    className="tabular h-12 text-center"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="receive-note">Delivery note / comment (optional)</Label>
          <Input
            id="receive-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Supplier delivery note number, short delivery, damage…"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">This receipt</p>
            <p className="tabular text-lg font-bold">
              {formatQty(totals.units)} units · {formatMoney(totals.value)}
            </p>
          </div>
          <Button size="lg" onClick={submit} disabled={busy || totals.units === 0}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Post receipt
          </Button>
        </div>
      </Card>
    </div>
  );
}
