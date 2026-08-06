"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

/** Posts the stock movements for a dispatch that was left as a draft. */
export function IssueDraftButton({ dispatchId }: { dispatchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    const { error } = await createClient().rpc("issue_dispatch", {
      p_dispatch_id: dispatchId,
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success("Dispatch issued — stock has come off.");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={issue} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Truck />}
      Issue now
    </Button>
  );
}
