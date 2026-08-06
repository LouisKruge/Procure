"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
import { formatMoney, formatQty } from "@/lib/utils";
import type { Site } from "@/lib/session";

type Line = {
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  qty: string;
  unit_cost: number;
  /** Snapshot of what is on hand at the chosen site when the line was added. */
  on_hand: number;
  reorder_point: number;
};

export function DispatchForm({
  sites,
  siteId,
  userName,
}: {
  sites: Site[];
  siteId: string | null;
  userName: string;
}) {
  const router = useRouter();
  const [site, setSite] = useState(siteId ?? sites[0]?.id ?? "");
  const [jobRef, setJobRef] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [customer, setCustomer] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState(userName);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  const addItem = useCallback(
    async (item: PickedItem) => {
      if (!site) {
        toast.error("Choose the site you are issuing from first.");
        return;
      }
      if (lines.some((l) => l.item_id === item.id)) {
        toast.info(`${item.sku} is already on this dispatch.`);
        return;
      }

      // Pull the level at *this* site - the search result is a cross-site
      // total and would understate a shortage at the counter.
      const supabase = createClient();
      const { data } = await supabase
        .from("v_stock_status")
        .select("qty_on_hand, reorder_point")
        .eq("item_id", item.id)
        .eq("site_id", site)
        .maybeSingle();

      setLines((ls) => [
        ...ls,
        {
          item_id: item.id,
          sku: item.sku,
          description: item.description,
          uom: item.uom,
          qty: "1",
          unit_cost: Number(item.avg_cost),
          on_hand: Number(data?.qty_on_hand ?? 0),
          reorder_point: Number(data?.reorder_point ?? 0),
        },
      ]);
    },
    [site, lines],
  );

  const totalUnits = lines.reduce((s, l) => s + Number(l.qty || 0), 0);
  const totalValue = lines.reduce(
    (s, l) => s + Number(l.qty || 0) * l.unit_cost,
    0,
  );

  const shortages = lines.filter((l) => Number(l.qty || 0) > l.on_hand);
  const breaches = lines.filter(
    (l) =>
      Number(l.qty || 0) <= l.on_hand &&
      l.on_hand - Number(l.qty || 0) <= l.reorder_point &&
      l.reorder_point > 0,
  );

  async function submit() {
    if (!site) return toast.error("Choose the site you are issuing from.");
    if (lines.length === 0) return toast.error("Add at least one item.");
    if (lines.some((l) => !Number(l.qty) || Number(l.qty) <= 0))
      return toast.error("Every line needs a quantity greater than zero.");
    if (shortages.length > 0)
      return toast.error(
        `Not enough ${shortages[0].sku} at this site — only ${formatQty(
          shortages[0].on_hand,
        )} ${shortages[0].uom} on hand.`,
      );

    setBusy(true);
    const supabase = createClient();

    const { data: dispatch, error: createError } = await supabase
      .from("dispatches")
      .insert({
        site_id: site,
        job_reference: jobRef.trim() || null,
        cost_center: costCenter.trim() || null,
        customer: customer.trim() || null,
        authorized_by: authorizedBy.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id, dispatch_number")
      .single();

    if (createError || !dispatch) {
      setBusy(false);
      return toast.error(friendlyError(createError));
    }

    const { error: linesError } = await supabase.from("dispatch_lines").insert(
      lines.map((l) => ({
        dispatch_id: dispatch.id,
        item_id: l.item_id,
        qty: Number(l.qty),
        unit_cost: l.unit_cost,
      })),
    );

    if (linesError) {
      setBusy(false);
      return toast.error(friendlyError(linesError));
    }

    // Posting the stock movements is a separate, transactional step in the
    // database, so a half-built dispatch is left as a draft rather than
    // partially issued.
    const { error: issueError } = await supabase.rpc("issue_dispatch", {
      p_dispatch_id: dispatch.id,
    });
    setBusy(false);

    if (issueError) {
      toast.error(friendlyError(issueError));
      router.push(`/dispatch/${dispatch.id}`);
      return;
    }

    toast.success(
      `${dispatch.dispatch_number} issued — ${formatQty(totalUnits)} units off stock.`,
    );
    router.push(`/dispatch/${dispatch.id}`);
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Issue from site</Label>
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
          <Label htmlFor="job">Job / works order reference</Label>
          <Input
            id="job"
            value={jobRef}
            onChange={(e) => setJobRef(e.target.value)}
            placeholder="JOB-4471"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc">Cost centre</Label>
          <Input
            id="cc"
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            placeholder="Maintenance"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cust">Customer (if applicable)</Label>
          <Input
            id="cust"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="auth">Authorised by</Label>
          <Input
            id="auth"
            value={authorizedBy}
            onChange={(e) => setAuthorizedBy(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
              const q = Number(line.qty || 0);
              const short = q > line.on_hand;
              const willBreach =
                !short && line.on_hand - q <= line.reorder_point && line.reorder_point > 0;

              return (
                <div key={line.item_id} className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.sku}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {line.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatQty(line.on_hand)} {line.uom} on hand ·{" "}
                      {formatMoney(line.unit_cost)} each
                    </p>
                    {short ? (
                      <Badge variant="out" className="mt-1">
                        <AlertTriangle className="size-3" /> Only{" "}
                        {formatQty(line.on_hand)} available
                      </Badge>
                    ) : willBreach ? (
                      <Badge variant="low" className="mt-1">
                        <AlertTriangle className="size-3" /> Drops to{" "}
                        {formatQty(line.on_hand - q)} — at or below reorder point
                      </Badge>
                    ) : null}
                  </div>

                  <Input
                    type="number"
                    inputMode="decimal"
                    value={line.qty}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) =>
                          j === i ? { ...l, qty: e.target.value } : l,
                        ),
                      )
                    }
                    className="tabular h-12 w-24 shrink-0 text-center text-lg font-bold"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${line.sku}`}
                    onClick={() =>
                      setLines((ls) => ls.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {breaches.length > 0 && shortages.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>
              {breaches.length} line{breaches.length > 1 ? "s" : ""}
            </strong>{" "}
            will drop to or below the reorder point once this goes out. It will
            appear in procurement immediately.
          </p>
        </div>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">This dispatch</p>
          <p className="tabular text-lg font-bold">
            {formatQty(totalUnits)} units · {formatMoney(totalValue)}
          </p>
        </div>
        <Button
          size="lg"
          onClick={submit}
          disabled={busy || lines.length === 0 || shortages.length > 0}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          Issue stock
        </Button>
      </Card>
    </div>
  );
}
