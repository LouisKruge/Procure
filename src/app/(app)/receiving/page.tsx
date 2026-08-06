import Link from "next/link";
import { PackagePlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatMoney, formatQty, relativeDays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { AdhocReceiveDialog } from "./adhoc-dialog";

export const dynamic = "force-dynamic";

export default async function ReceivingPage() {
  const session = await getSession();
  const supabase = await createClient();

  let query = supabase
    .from("v_purchase_order_summary")
    .select("*")
    .in("status", ["sent", "partially_received"])
    .order("expected_date", { ascending: true });

  if (session.siteId) query = query.eq("site_id", session.siteId);

  const { data: pos } = await query;
  const open = pos ?? [];

  return (
    <>
      <RealtimeRefresh tables={["purchase_orders", "stock_movements"]} />

      <PageHeader
        title="Receiving"
        description="Book stock in against a purchase order, or receive ad-hoc."
        action={<AdhocReceiveDialog sites={session.sites} siteId={session.siteId} />}
      />

      {open.length === 0 ? (
        <EmptyState
          icon={<PackagePlus />}
          title="No open purchase orders"
          description={
            session.site
              ? `Nothing is outstanding for ${session.site.name}. Anything arriving without a PO can be received ad-hoc.`
              : "Nothing is outstanding. Anything arriving without a PO can be received ad-hoc."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/procurement">Raise a purchase order</Link>
            </Button>
          }
        />
      ) : (
        <SectionCard title={`${open.length} awaiting delivery`}>
          {open.map((po) => (
            <ListRow
              key={po.id}
              href={`/receiving/${po.id}`}
              tone={po.is_overdue ? "low" : undefined}
              title={`${po.po_number} — ${po.supplier_name}`}
              subtitle={`${po.site_code} · ${po.is_overdue ? "overdue," : "due"} ${relativeDays(
                po.expected_date,
              )} · ${formatQty(po.outstanding_qty)} of ${formatQty(
                po.total_ordered,
              )} outstanding`}
              right={<DocStatusBadge status={po.status ?? "sent"} />}
              rightSub={formatMoney(po.total_value)}
            />
          ))}
        </SectionCard>
      )}
    </>
  );
}
