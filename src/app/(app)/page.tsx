import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  PackageX,
  ShoppingCart,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatQty, relativeDays } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  QtyWithUom,
  SectionCard,
  StatTile,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const supabase = await createClient();
  const siteId = session.siteId;

  // One round trip for everything the landing screen needs. RLS already
  // limits these to sites the user can see; siteId narrows further when a
  // specific site is selected in the header.
  const scoped = <T,>(q: T & { eq: (c: string, v: string) => T }) =>
    siteId ? q.eq("site_id", siteId) : q;

  const [
    stockOut,
    belowReorder,
    valuation,
    openPos,
    inboundTransfers,
    pendingTakes,
    criticalItems,
    recentMovements,
  ] = await Promise.all([
    scoped(
      supabase
        .from("v_stock_status")
        .select("*", { count: "exact", head: true })
        .eq("stock_status", "out"),
    ),
    scoped(
      supabase
        .from("v_stock_status")
        .select("*", { count: "exact", head: true })
        .eq("stock_status", "low"),
    ),
    scoped(supabase.from("v_stock_valuation").select("total_value, total_qty")),
    scoped(
      supabase
        .from("v_purchase_order_summary")
        .select("*")
        .in("status", ["sent", "partially_received"])
        .order("expected_date", { ascending: true })
        .limit(6),
    ),
    supabase
      .from("transfers")
      .select(
        "id, transfer_number, status, sent_at, from_site:sites!transfers_from_site_id_fkey(code), to_site:sites!transfers_to_site_id_fkey(code, id)",
      )
      .eq("status", "in_transit")
      .order("sent_at", { ascending: true })
      .limit(6),
    scoped(
      supabase
        .from("v_stock_take_summary")
        .select("*")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true })
        .limit(6),
    ),
    scoped(
      supabase
        .from("v_stock_status")
        .select("*")
        .in("stock_status", ["out", "low"])
        .order("stock_status", { ascending: true })
        .order("qty_on_hand", { ascending: true })
        .limit(8),
    ),
    scoped(
      supabase
        .from("v_movement_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ),
  ]);

  const totalValue = (valuation.data ?? []).reduce(
    (sum, r) => sum + Number(r.total_value ?? 0),
    0,
  );

  const overdueCount = (openPos.data ?? []).filter((p) => p.is_overdue).length;
  const inbound = (inboundTransfers.data ?? []).filter(
    (t) => !siteId || (t.to_site as { id?: string } | null)?.id === siteId,
  );

  const scopeLabel = session.site ? session.site.name : "All sites";

  return (
    <>
      <RealtimeRefresh />

      <PageHeader
        title="Today"
        description={`${scopeLabel} · ${new Date().toLocaleDateString("en-ZA", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/stock">
              Stock lookup <kbd className="kbd ml-1">Ctrl K</kbd>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Stocked out"
          value={stockOut.count ?? 0}
          sub="lines at zero"
          tone={(stockOut.count ?? 0) > 0 ? "out" : "ok"}
          href="/procurement"
          icon={<PackageX />}
        />
        <StatTile
          label="Below reorder"
          value={belowReorder.count ?? 0}
          sub="need ordering"
          tone={(belowReorder.count ?? 0) > 0 ? "low" : "ok"}
          href="/procurement"
          icon={<TrendingDown />}
        />
        <StatTile
          label="Open POs"
          value={openPos.data?.length ?? 0}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : "on schedule"}
          tone={overdueCount > 0 ? "low" : "neutral"}
          href="/procurement/orders"
          icon={<ShoppingCart />}
        />
        <StatTile
          label="In transit"
          value={inbound.length}
          sub="awaiting receipt"
          tone={inbound.length > 0 ? "transit" : "neutral"}
          href="/transfers"
          icon={<ArrowLeftRight />}
        />
        <StatTile
          label="Stock value"
          value={formatMoney(totalValue)}
          sub={scopeLabel}
          href="/reports"
          icon={<Wallet />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Needs attention"
          empty={(criticalItems.data ?? []).length === 0}
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/procurement">Order</Link>
            </Button>
          }
        >
          {(criticalItems.data ?? []).map((row) => (
            <ListRow
              key={row.level_id}
              href={`/stock/${row.item_id}`}
              tone={row.stock_status === "out" ? "out" : "low"}
              title={`${row.sku} — ${row.description}`}
              subtitle={`${row.site_code} · bin ${row.bin_location ?? "—"} · reorder at ${formatQty(row.reorder_point)}`}
              right={
                <QtyWithUom
                  qty={row.qty_on_hand}
                  uom={row.uom}
                  className={row.stock_status === "out" ? "text-out" : "text-low"}
                />
              }
              rightSub={
                Number(row.qty_on_order ?? 0) > 0
                  ? `${formatQty(row.qty_on_order)} on order`
                  : undefined
              }
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Awaiting your approval"
          empty={(pendingTakes.data ?? []).length === 0}
        >
          {(pendingTakes.data ?? []).map((take) => (
            <ListRow
              key={take.id}
              href={`/stock-takes/${take.id}`}
              tone="low"
              title={`${take.reference} — ${take.site_code}`}
              subtitle={`${take.variance_lines} lines out · counted ${relativeDays(take.submitted_at)}`}
              right={
                <span
                  className={
                    Number(take.variance_value) < 0
                      ? "tabular font-semibold text-out"
                      : "tabular font-semibold text-ok"
                  }
                >
                  {formatMoney(take.variance_value)}
                </span>
              }
              rightSub="variance"
            />
          ))}
        </SectionCard>

        <SectionCard title="Deliveries due" empty={(openPos.data ?? []).length === 0}>
          {(openPos.data ?? []).map((po) => (
            <ListRow
              key={po.id}
              href={`/receiving/${po.id}`}
              tone={po.is_overdue ? "low" : undefined}
              title={`${po.po_number} — ${po.supplier_name}`}
              subtitle={`${po.site_code} · ${
                po.is_overdue ? "overdue" : "due"
              } ${relativeDays(po.expected_date)} · ${formatQty(po.outstanding_qty)} outstanding`}
              right={<DocStatusBadge status={po.status ?? "sent"} />}
              rightSub={formatMoney(po.total_value)}
            />
          ))}
        </SectionCard>

        <SectionCard title="Stock in transit" empty={inbound.length === 0}>
          {inbound.map((t) => {
            const from = t.from_site as { code?: string } | null;
            const to = t.to_site as { code?: string } | null;
            return (
              <ListRow
                key={t.id}
                href={`/transfers/${t.id}`}
                tone="transit"
                title={`${t.transfer_number} — ${from?.code} → ${to?.code}`}
                subtitle={`Sent ${relativeDays(t.sent_at)}`}
                right={<Badge variant="transit">Receive</Badge>}
              />
            );
          })}
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Recent movements"
          empty={(recentMovements.data ?? []).length === 0}
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/reports">Export</Link>
            </Button>
          }
        >
          {(recentMovements.data ?? []).map((m) => (
            <ListRow
              key={m.id}
              href={`/stock/${m.item_id}`}
              title={`${m.sku} — ${m.description}`}
              subtitle={`${m.site_code} · ${m.reason ?? m.movement_type} · ${relativeDays(m.created_at)}${
                m.user_name ? ` · ${m.user_name}` : ""
              }`}
              right={
                <span
                  className={
                    m.direction === "in"
                      ? "tabular font-semibold text-ok"
                      : "tabular font-semibold text-out"
                  }
                >
                  {m.direction === "in" ? "+" : "−"}
                  {formatQty(m.qty)}
                </span>
              }
              rightSub={m.reference_no ?? undefined}
            />
          ))}
        </SectionCard>
      </div>

      {(criticalItems.data ?? []).length === 0 &&
      (pendingTakes.data ?? []).length === 0 ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="size-4" />
          Nothing needs action at {scopeLabel.toLowerCase()} right now.
        </p>
      ) : null}
    </>
  );
}
