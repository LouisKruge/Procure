import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";

import { TransferForm } from "./transfer-form";

export const dynamic = "force-dynamic";

export default async function NewTransferPage() {
  const session = await getSession();
  const supabase = await createClient();

  // The destination can be any site, including ones the user cannot
  // otherwise act on - they are sending stock there, not managing it.
  const { data: allSites } = await supabase
    .from("sites")
    .select("*")
    .eq("is_active", true)
    .order("code");

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/transfers">
            <ArrowLeft /> Transfers
          </Link>
        </Button>
      </div>

      <PageHeader
        title="New transfer"
        description="Stock comes off the sending site as soon as you send."
      />

      <TransferForm
        fromSites={session.sites}
        toSites={allSites ?? session.sites}
        siteId={session.siteId}
      />
    </>
  );
}
