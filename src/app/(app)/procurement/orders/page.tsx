import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDate, formatMoney, formatQty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const session = await getSession();
  const supabase = await createClient();

  let query = supabase
    .from("v_purchase_order_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);

  if (session.siteId) query = query.eq("site_id", session.siteId);

  const { data } = await query;
  const pos = data ?? [];

  const drafts = pos.filter((p) => p.status === "draft");
  const open = pos.filter(
    (p) => p.status === "sent" || p.status === "partially_received",
  );
  const closed = pos.filter(
    (p) => p.status === "received" || p.status === "closed" || p.status === "cancelled",
  );

  return (
    <>
      <RealtimeRefresh tables={["purchase_orders"]} />

      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/procurement">
            <ArrowLeft /> Reorder suggestions
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Purchase orders"
        description="Draft, sent and received orders across your sites."
      />

      {pos.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart />}
          title="No purchase orders yet"
          description="Raise one from the reorder suggestions."
          action={
            <Button asChild>
              <Link href="/procurement">Go to suggestions</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {drafts.length > 0 ? (
            <SectionCard title={`${drafts.length} draft — not yet sent`}>
              {drafts.map((po) => (
                <ListRow
                  key={po.id}
                  href={`/procurement/orders/${po.id}`}
                  tone="low"
                  title={`${po.po_number} — ${po.supplier_name}`}
                  subtitle={`${po.site_code} · ${po.line_count} lines · created ${formatDate(po.created_at)}`}
                  right={<DocStatusBadge status={po.status ?? "draft"} />}
                  rightSub={formatMoney(po.total_value)}
                />
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title="Awaiting delivery" empty={open.length === 0}>
            {open.map((po) => (
              <ListRow
                key={po.id}
                href={`/procurement/orders/${po.id}`}
                tone={po.is_overdue ? "low" : undefined}
                title={`${po.po_number} — ${po.supplier_name}`}
                subtitle={`${po.site_code} · expected ${formatDate(po.expected_date)}${
                  po.is_overdue ? " (overdue)" : ""
                } · ${formatQty(po.outstanding_qty)} outstanding`}
                right={<DocStatusBadge status={po.status ?? "sent"} />}
                rightSub={formatMoney(po.total_value)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Completed" empty={closed.length === 0}>
            {closed.map((po) => (
              <ListRow
                key={po.id}
                href={`/procurement/orders/${po.id}`}
                title={`${po.po_number} — ${po.supplier_name}`}
                subtitle={`${po.site_code} · received ${formatDate(po.actual_date)}`}
                right={<DocStatusBadge status={po.status ?? "received"} />}
                rightSub={formatMoney(po.total_value)}
              />
            ))}
          </SectionCard>
        </div>
      )}
    </>
  );
}
