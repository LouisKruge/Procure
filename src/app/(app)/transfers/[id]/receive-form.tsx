"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatQty } from "@/lib/utils";

type Line = {
  line_id: string;
  sku: string;
  description: string;
  uom: string;
  qty_sent: number;
};

/**
 * Booking a transfer in. Quantities default to what was sent - the common
 * case is that everything arrived - but a short delivery can be recorded
 * exactly, and the shortfall stays visible rather than being written off.
 */
export function ReceiveTransferForm({
  transferId,
  transferNumber,
  lines,
}: {
  transferId: string;
  transferNumber: string;
  lines: Line[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.line_id, String(l.qty_sent)])),
  );
  const [busy, setBusy] = useState(false);

  const shortLines = lines.filter(
    (l) => Number(qty[l.line_id] ?? l.qty_sent) < l.qty_sent,
  );

  async function submit() {
    const over = lines.find((l) => Number(qty[l.line_id] ?? 0) > l.qty_sent);
    if (over) {
      return toast.error(
        `${over.sku}: only ${formatQty(over.qty_sent)} ${over.uom} were sent.`,
      );
    }

    setBusy(true);
    const { error } = await createClient().rpc("receive_transfer", {
      p_transfer_id: transferId,
      p_lines: lines.map((l) => ({
        line_id: l.line_id,
        qty: Number(qty[l.line_id] ?? l.qty_sent),
      })),
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success(
      shortLines.length > 0
        ? `${transferNumber} booked in with ${shortLines.length} short line${
            shortLines.length > 1 ? "s" : ""
          } recorded.`
        : `${transferNumber} booked in — stock is now on hand.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="divide-y">
          {lines.map((line) => {
            const received = Number(qty[line.line_id] ?? line.qty_sent);
            const short = received < line.qty_sent;
            return (
              <div key={line.line_id} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {line.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(line.qty_sent)} {line.uom} sent
                  </p>
                  {short ? (
                    <Badge variant="low" className="mt-1">
                      {formatQty(line.qty_sent - received)} short
                    </Badge>
                  ) : null}
                </div>

                <div className="w-28 shrink-0">
                  <Label className="mb-1 block text-xs">Arrived</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={qty[line.line_id] ?? ""}
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [line.line_id]: e.target.value }))
                    }
                    className="tabular h-12 text-center text-lg font-bold"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Confirm arrival</p>
          <p className="text-sm">
            {shortLines.length === 0
              ? "Everything sent is being booked in."
              : `${shortLines.length} line${shortLines.length > 1 ? "s" : ""} short of what was sent.`}
          </p>
        </div>
        <Button size="lg" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          Book in
        </Button>
      </Card>
    </div>
  );
}
