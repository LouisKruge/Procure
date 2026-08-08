import Link from "next/link";

import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatQty, relativeDays } from "@/lib/utils";
import { Chip } from "@/components/ui/data-display";
import { RealtimeRefresh } from "@/components/realtime-refresh";

import {
  FeedRow,
  Greeting,
  HealthCard,
  Panel,
  RiskCard,
  RiskCategories,
  ThroughputCard,
  ValueCard,
} from "./dashboard-cards";

export const dynamic = "force-dynamic";

/** Days of cover turned into a plain-language date, not a number to decode. */
function stockoutLabel(cover: number | null) {
  if (cover === null || !Number.isFinite(cover)) return null;
  if (cover <= 0) return "out now";
  if (cover < 1) return "out today";
  if (cover < 2) return "out tomorrow";
  if (cover < 14) return `~${Math.round(cover)} days left`;
  return null;
}

export default async function OverviewPage() {
  const session = await getSession();
  const supabase = await createClient();
  const siteId = session.siteId;

  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
    siteId ? q.eq("site_id", siteId) : q;

  const [
    valuation,
    critical,
    usage,
    weekly,
    pendingTakes,
    openPos,
    inTransit,
    recent,
    totalLines,
    health,
    riskCategories,
  ] = await Promise.all([
    scope(supabase.from("v_stock_valuation").select("total_value, lines_total, lines_with_stock")),
    scope(
      supabase
        .from("v_stock_status")
        .select("*")
        .in("stock_status", ["out", "low"])
        .order("stock_status", { ascending: true })
        .order("stock_value", { ascending: false })
        .limit(10),
    ),
    supabase.rpc("item_usage_stats", {
      p_days: 30,
      p_site_id: siteId ?? undefined,
      p_limit: 400,
    }),
    supabase.rpc("usage_by_period", {
      p_bucket: "week",
      p_periods: 8,
      p_site_id: siteId ?? undefined,
    }),
    scope(
      supabase
        .from("v_stock_take_summary")
        .select("*")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true })
        .limit(4),
    ),
    scope(
      supabase
        .from("v_purchase_order_summary")
        .select("*")
        .in("status", ["sent", "partially_received"])
        .order("expected_date", { ascending: true })
        .limit(4),
    ),
    supabase
      .from("transfers")
      .select("id, transfer_number, sent_at, from_site:sites!transfers_from_site_id_fkey(code), to_site:sites!transfers_to_site_id_fkey(code)")
      .eq("status", "in_transit")
      .order("sent_at", { ascending: true })
      .limit(4),
    scope(
      supabase
        .from("v_movement_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(7),
    ),
    scope(supabase.from("v_stock_status").select("*", { count: "exact", head: true })),
    supabase.rpc("inventory_health", { p_site_id: siteId ?? undefined }),
    supabase.rpc("risk_by_category", { p_site_id: siteId ?? undefined, p_limit: 5 }),
  ]);

  const val = valuation.data ?? [];
  const totalValue = val.reduce((s, r) => s + Number(r.total_value ?? 0), 0);
  const lines = totalLines.count ?? 0;

  const usageRows = (usage.data ?? []) as {
    item_id: string;
    qty_issued: number;
    stock_value: number;
    days_cover: number | null;
  }[];

  const coverBySku = new Map(usageRows.map((r) => [r.item_id, r.days_cover]));
  const deadRows = usageRows.filter((r) => Number(r.qty_issued) === 0 && Number(r.stock_value) > 0);
  const deadValue = deadRows.reduce((s, r) => s + Number(r.stock_value), 0);

  const weeks = (weekly.data ?? []) as {
    qty_issued: number;
    qty_received: number;
  }[];
  const issued7 = Number(weeks.at(-1)?.qty_issued ?? 0);
  const received7 = Number(weeks.at(-1)?.qty_received ?? 0);

  const criticalRows = critical.data ?? [];
  const stockedOut = criticalRows.filter((r) => r.stock_status === "out");
  const exposure = criticalRows.reduce(
    (s, r) => s + Number(r.reorder_qty ?? 0) * Number(r.avg_cost ?? 0),
    0,
  );

  const outCount = stockedOut.length;
  const lowCount = criticalRows.length - outCount;

  const bands = (health.data ?? [])[0];
  const riskRows = (riskCategories.data ?? []) as {
    category_name: string;
    lines: number;
    value_at_risk: number;
  }[];

  return (
    <>
      <RealtimeRefresh />

      {/* Header ------------------------------------------------------- */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <Greeting
          name={session.fullName}
          site={session.site ? session.site.name : "All sites"}
          status={
            outCount === 0 && lowCount === 0
              ? "All systems operational"
              : outCount > 0
                ? `${formatQty(outCount)} ${outCount === 1 ? "line" : "lines"} at zero`
                : `${formatQty(lowCount)} below minimum`
          }
        />
        <div className="flex items-center gap-2">
          <Link
            href="/dispatch/new"
            className="flex h-9 items-center gap-2 rounded-[var(--r-md)] bg-[var(--layer-surface)] px-3.5 text-[13px] font-medium ring-1 ring-inset ring-[var(--line-strong)] transition-colors hover:bg-[var(--layer-elevated)]"
          >
            Issue stock <kbd className="kbd">⇧D</kbd>
          </Link>
          <Link
            href="/receiving"
            className="flex h-9 items-center gap-2 rounded-[var(--r-md)] bg-[var(--brass)] px-3.5 text-[13px] font-medium text-[#0B0A08] transition-colors hover:bg-[var(--brass-bright)]"
          >
            Receive
            <kbd className="kbd bg-black/10 text-black/55 shadow-none">⇧R</kbd>
          </Link>
        </div>
      </div>

      {/* Hero row ----------------------------------------------------- */}
      <div className="stagger grid gap-3 lg:grid-cols-3">
        <RiskCard
          stockedOut={outCount}
          low={lowCount}
          totalLines={lines}
          exposure={exposure}
        />
        <ValueCard
          totalValue={totalValue}
          deadValue={deadValue}
          deadLines={deadRows.length}
          totalLines={lines}
        />
        <ThroughputCard
          issued={issued7}
          received={received7}
          periodLabel="this week"
          series={{
            out: weeks.map((w) => Number(w.qty_issued)),
            in: weeks.map((w) => Number(w.qty_received)),
          }}
        />
      </div>

      {/* Working set -------------------------------------------------- */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Needs ordering"
          count={criticalRows.length}
          tone={outCount > 0 ? "critical" : "attention"}
          empty={criticalRows.length === 0}
          emptyLabel="Every line is above its minimum"
          action={
            <Link
              href="/procurement"
              className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
            >
              Raise orders
            </Link>
          }
        >
          {criticalRows.map((row) => {
            const cover = coverBySku.get(row.item_id!) ?? null;
            const forecast = stockoutLabel(cover);
            const out = row.stock_status === "out";

            return (
              <FeedRow
                key={row.level_id}
                href={`/stock/${row.item_id}`}
                tone={out ? "critical" : "attention"}
                code={row.sku ?? undefined}
                title={row.description ?? ""}
                meta={[
                  row.bin_location ? `bin ${row.bin_location}` : null,
                  row.location,
                  row.default_supplier_name,
                  Number(row.qty_on_order ?? 0) > 0
                    ? `${formatQty(row.qty_on_order)} on order`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                chip={
                  out ? (
                    <Chip tone="critical">Out</Chip>
                  ) : forecast ? (
                    <Chip tone="attention">{forecast}</Chip>
                  ) : (
                    <Chip tone="attention">Below min</Chip>
                  )
                }
                value={
                  <span className={out ? "text-[var(--critical-bright)]" : undefined}>
                    {formatQty(row.qty_on_hand)}
                    <span className="ml-1 text-[10px] font-normal text-[var(--text-quaternary)]">
                      {row.uom}
                    </span>
                  </span>
                }
                valueLabel={`min ${formatQty(row.reorder_point)}`}
              />
            );
          })}
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel
            title="Awaiting approval"
            count={pendingTakes.data?.length ?? 0}
            tone="pending"
            empty={(pendingTakes.data ?? []).length === 0}
            emptyLabel="No counts waiting on you"
          >
            {(pendingTakes.data ?? []).map((t) => (
              <FeedRow
                key={t.id}
                href={`/stock-takes/${t.id}`}
                tone="pending"
                code={t.reference ?? undefined}
                title={`${t.variance_lines} lines out of ${t.line_count}`}
                meta={`${t.site_code} · submitted ${relativeDays(t.submitted_at)}`}
                value={
                  <span
                    className={
                      Number(t.variance_value) < 0
                        ? "text-[var(--critical-bright)]"
                        : "text-[var(--success-bright)]"
                    }
                  >
                    {formatMoney(t.variance_value)}
                  </span>
                }
                valueLabel="variance"
              />
            ))}
          </Panel>

          <Panel
            title="Deliveries due"
            count={openPos.data?.length ?? 0}
            tone="auto"
            empty={(openPos.data ?? []).length === 0}
            emptyLabel="Nothing outstanding with suppliers"
          >
            {(openPos.data ?? []).map((po) => (
              <FeedRow
                key={po.id}
                href={`/receiving/${po.id}`}
                tone={po.is_overdue ? "attention" : "auto"}
                code={po.po_number ?? undefined}
                title={po.supplier_name ?? ""}
                meta={`${po.site_code} · ${po.is_overdue ? "overdue" : "due"} ${relativeDays(po.expected_date)}`}
                chip={po.is_overdue ? <Chip tone="attention">Late</Chip> : undefined}
                value={formatQty(po.outstanding_qty)}
                valueLabel="outstanding"
              />
            ))}
          </Panel>

          {(inTransit.data ?? []).length > 0 ? (
            <Panel title="In transit" count={inTransit.data?.length} tone="auto">
              {(inTransit.data ?? []).map((t) => {
                const from = t.from_site as { code?: string } | null;
                const to = t.to_site as { code?: string } | null;
                return (
                  <FeedRow
                    key={t.id}
                    href={`/transfers/${t.id}`}
                    tone="auto"
                    code={t.transfer_number}
                    title={`${from?.code} → ${to?.code}`}
                    meta={`sent ${relativeDays(t.sent_at)}`}
                    chip={<Chip tone="auto">Receive</Chip>}
                  />
                );
              })}
            </Panel>
          ) : null}
        </div>
      </div>

      {/* Activity ----------------------------------------------------- */}
      <div className="mt-3">
        <Panel
          title="Warehouse activity"
          empty={(recent.data ?? []).length === 0}
          emptyLabel="No movements recorded yet — this fills in as stock is booked in and out"
          action={
            <Link
              href="/reports"
              className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
            >
              Full log
            </Link>
          }
        >
          {(recent.data ?? []).map((m) => (
            <FeedRow
              key={m.id}
              href={`/stock/${m.item_id}`}
              tone={m.direction === "in" ? "success" : undefined}
              code={m.sku ?? undefined}
              title={m.description ?? ""}
              meta={[
                m.site_code,
                m.reason ?? m.movement_type,
                m.user_name,
                relativeDays(m.created_at),
              ]
                .filter(Boolean)
                .join(" · ")}
              value={
                <span
                  className={
                    m.direction === "in"
                      ? "text-[var(--success-bright)]"
                      : "text-[var(--text-primary)]"
                  }
                >
                  {m.direction === "in" ? "+" : "−"}
                  {formatQty(m.qty)}
                </span>
              }
              valueLabel={m.reference_no ?? undefined}
            />
          ))}
        </Panel>
      </div>

      {/* Standing ----------------------------------------------------- */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <HealthCard
          good={Number(bands?.good_lines ?? 0)}
          watch={Number(bands?.watch_lines ?? 0)}
          atRisk={Number(bands?.at_risk_lines ?? 0)}
          critical={Number(bands?.critical_lines ?? 0)}
          score={Number(bands?.health_score ?? 100)}
        />
        <RiskCategories rows={riskRows} />
      </div>
    </>
  );
}
