"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

/**
 * Marks a draft PO as sent. The quantities then count as on-order, which is
 * what stops the same shortfall being suggested again next time.
 */
export function SendPoButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const { error } = await createClient().rpc("send_purchase_order", {
      p_po_id: poId,
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success("Purchase order marked as sent — quantities now show as on order.");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={send} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Send />}
      Mark as sent
    </Button>
  );
}
