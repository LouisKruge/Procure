"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus } from "lucide-react";
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
import { ItemPicker, type PickedItem } from "@/components/item-picker";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatMoney, formatQty } from "@/lib/utils";
import type { Site } from "@/lib/session";

export function AdhocReceiveDialog({
  sites,
  siteId,
}: {
  sites: Site[];
  siteId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState(siteId ?? sites[0]?.id ?? "");
  const [item, setItem] = useState<PickedItem | null>(null);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setItem(null);
    setQty("");
    setCost("");
    setReason("");
  }

  async function submit() {
    if (!item) return toast.error("Pick the item you are receiving.");
    if (!site) return toast.error("Choose which site the stock is landing at.");
    const q = Number(qty);
    if (!q || q <= 0) return toast.error("Enter how many you are receiving.");
    if (!reason.trim())
      return toast.error("Give a reason so the receipt can be traced later.");

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("receive_adhoc", {
      p_item_id: item.id,
      p_site_id: site,
      p_qty: q,
      p_unit_cost: cost === "" ? item.avg_cost : Number(cost),
      p_reason: reason.trim(),
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success(
      `Received ${formatQty(q)} ${item.uom} of ${item.sku}. Average cost updated.`,
    );
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <PackagePlus /> Ad-hoc receipt
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive without a PO</DialogTitle>
          <DialogDescription>
            For counter buys, returns to stock and anything that arrives
            unordered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site</Label>
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
            <Label>Item</Label>
            {item ? (
              <div className="flex items-center gap-3 rounded-lg border-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setItem(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <ItemPicker onPick={setItem} autoFocus />
            )}
          </div>

          {item ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity ({item.uom})</Label>
                <QtyInput
                  value={qty}
                  autoFocus
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit cost</Label>
                <QtyInput
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder={String(item.avg_cost)}
                />
                <p className="text-xs text-muted-foreground">
                  Blank uses current average {formatMoney(item.avg_cost)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="adhoc-reason">Reason</Label>
            <Input
              id="adhoc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cash purchase, returned from job 4471…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !item}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Receive stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
