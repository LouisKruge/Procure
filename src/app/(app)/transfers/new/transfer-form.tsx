"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemPicker, type PickedItem } from "@/components/item-picker";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatQty } from "@/lib/utils";
import type { Site } from "@/lib/session";

type Line = {
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  qty: string;
  on_hand: number;
};

export function TransferForm({
  fromSites,
  toSites,
  siteId,
}: {
  fromSites: Site[];
  toSites: Site[];
  siteId: string | null;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(siteId ?? fromSites[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  const addItem = useCallback(
    async (item: PickedItem) => {
      if (!from) return toast.error("Choose the sending site first.");
      if (lines.some((l) => l.item_id === item.id))
        return toast.info(`${item.sku} is already on this transfer.`);

      const { data } = await createClient()
        .from("v_stock_status")
        .select("qty_on_hand")
        .eq("item_id", item.id)
        .eq("site_id", from)
        .maybeSingle();

      setLines((ls) => [
        ...ls,
        {
          item_id: item.id,
          sku: item.sku,
          description: item.description,
          uom: item.uom,
          qty: "1",
          on_hand: Number(data?.qty_on_hand ?? 0),
        },
      ]);
    },
    [from, lines],
  );

  const shortages = lines.filter((l) => Number(l.qty || 0) > l.on_hand);
  const totalUnits = lines.reduce((s, l) => s + Number(l.qty || 0), 0);

  async function submit() {
    if (!from || !to) return toast.error("Choose both a sending and a receiving site.");
    if (from === to) return toast.error("The two sites must be different.");
    if (lines.length === 0) return toast.error("Add at least one item.");
    if (lines.some((l) => !Number(l.qty) || Number(l.qty) <= 0))
      return toast.error("Every line needs a quantity greater than zero.");
    if (shortages.length > 0)
      return toast.error(
        `Not enough ${shortages[0].sku} — only ${formatQty(shortages[0].on_hand)} ${
          shortages[0].uom
        } at the sending site.`,
      );

    setBusy(true);
    const supabase = createClient();

    const { data: transfer, error: createError } = await supabase
      .from("transfers")
      .insert({ from_site_id: from, to_site_id: to, notes: notes.trim() || null })
      .select("id, transfer_number")
      .single();

    if (createError || !transfer) {
      setBusy(false);
      return toast.error(friendlyError(createError));
    }

    const { error: linesError } = await supabase.from("transfer_lines").insert(
      lines.map((l) => ({
        transfer_id: transfer.id,
        item_id: l.item_id,
        qty_sent: Number(l.qty),
      })),
    );

    if (linesError) {
      setBusy(false);
      return toast.error(friendlyError(linesError));
    }

    const { error: sendError } = await supabase.rpc("send_transfer", {
      p_transfer_id: transfer.id,
    });
    setBusy(false);

    if (sendError) {
      toast.error(friendlyError(sendError));
      router.push(`/transfers/${transfer.id}`);
      return;
    }

    const toCode = toSites.find((s) => s.id === to)?.code;
    toast.success(
      `${transfer.transfer_number} sent — ${formatQty(totalUnits)} units in transit to ${toCode}.`,
    );
    router.push(`/transfers/${transfer.id}`);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Sending site" />
              </SelectTrigger>
              <SelectContent>
                {fromSites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="mx-auto hidden size-5 text-muted-foreground sm:block sm:self-center" />

          <div className="space-y-1.5">
            <Label>To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Receiving site" />
              </SelectTrigger>
              <SelectContent>
                {toSites
                  .filter((s) => s.id !== from)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="transfer-notes">Notes</Label>
          <Input
            id="transfer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Driver, vehicle, reason for the move…"
          />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <Label>Add items</Label>
        <ItemPicker onPick={addItem} placeholder="Scan or search to add an item…" />
      </Card>

      {lines.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {lines.map((line, i) => {
              const short = Number(line.qty || 0) > line.on_hand;
              return (
                <div key={line.item_id} className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.sku}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {line.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatQty(line.on_hand)} {line.uom} at sending site
                    </p>
                    {short ? (
                      <Badge variant="out" className="mt-1">
                        <AlertTriangle className="size-3" /> Only{" "}
                        {formatQty(line.on_hand)} available
                      </Badge>
                    ) : null}
                  </div>

                  <Input
                    type="number"
                    inputMode="decimal"
                    value={line.qty}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) => (j === i ? { ...l, qty: e.target.value } : l)),
                      )
                    }
                    className="tabular h-12 w-24 shrink-0 text-center text-lg font-bold"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${line.sku}`}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Sending</p>
          <p className="tabular text-lg font-bold">{formatQty(totalUnits)} units</p>
        </div>
        <Button
          size="lg"
          onClick={submit}
          disabled={busy || lines.length === 0 || shortages.length > 0 || !to}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          Send transfer
        </Button>
      </Card>
    </div>
  );
}
