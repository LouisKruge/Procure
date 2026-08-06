"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, QtyInput } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type Level = { site_id: string; site_code: string; qty_on_hand: number };

/**
 * Manual correction outside a stock take. Deliberately requires a reason -
 * the database rejects it otherwise - so an adjustment can always be
 * explained six months later.
 */
export function AdjustStockDialog({
  itemId,
  sku,
  uom,
  sites,
  levels,
}: {
  itemId: string;
  sku: string;
  uom: string;
  sites: Site[];
  levels: Level[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState(levels[0]?.site_id ?? sites[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const current = levels.find((l) => l.site_id === siteId)?.qty_on_hand ?? 0;
  const target = qty === "" ? null : Number(qty);
  const delta = target === null ? 0 : target - current;

  async function submit() {
    if (target === null || Number.isNaN(target)) {
      toast.error("Enter the quantity you actually counted.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Give a reason - adjustments are never posted silently.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("adjust_stock", {
      p_item_id: itemId,
      p_site_id: siteId,
      p_new_qty: target,
      p_reason: reason.trim(),
    });
    setBusy(false);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }

    toast.success(
      `${sku} adjusted to ${formatQty(target)} ${uom} — movement logged.`,
    );
    setOpen(false);
    setQty("");
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal /> Adjust
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {sku}</DialogTitle>
          <DialogDescription>
            This posts a logged adjustment movement, not a silent overwrite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
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
            <Label>
              Counted quantity — currently {formatQty(current)} {uom}
            </Label>
            <QtyInput
              value={qty}
              autoFocus
              onChange={(e) => setQty(e.target.value)}
              placeholder={String(current)}
            />
            {target !== null && !Number.isNaN(target) && delta !== 0 ? (
              <p
                className={`text-sm font-medium ${delta > 0 ? "text-ok" : "text-out"}`}
              >
                {delta > 0 ? "+" : "−"}
                {formatQty(Math.abs(delta))} {uom} will be posted
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged in rack, miscount, found in bin…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Post adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
