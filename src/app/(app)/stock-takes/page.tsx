import { ClipboardCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatMoney, relativeDays } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";

import { StartStockTakeDialog } from "./start-dialog";

export const dynamic = "force-dynamic";

export default async function StockTakesPage() {
  const session = await getSession();
  const supabase = await createClient();

  let query = supabase
    .from("v_stock_take_summary")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(40);

  if (session.siteId) query = query.eq("site_id", session.siteId);

  const [{ data: takes }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, code, name, parent_id").order("sort_order"),
  ]);

  const all = takes ?? [];
  const counting = all.filter((t) => t.status === "counting");
  const pending = all.filter((t) => t.status === "pending_approval");
  const done = all.filter((t) => t.status === "approved" || t.status === "cancelled");

  const subtitle = (t: (typeof all)[number]) =>
    `${t.site_code} · ${t.counted_count}/${t.line_count} counted · ${t.variance_lines} out`;

  return (
    <>
      <RealtimeRefresh tables={["stock_takes", "stock_take_lines"]} />

      <PageHeader
        title="Stock takes"
        description="Count sessions post as adjustments only once a supervisor approves them."
        action={
          <StartStockTakeDialog
            sites={session.sites}
            siteId={session.siteId}
            categories={categories ?? []}
          />
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="No stock takes yet"
          description="Start a full count, or a cycle count limited to one category or a bin range."
        />
      ) : (
        <div className="space-y-4">
          {pending.length > 0 ? (
            <SectionCard
              title={`${pending.length} awaiting approval${
                session.isManager ? "" : " (supervisor only)"
              }`}
            >
              {pending.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/stock-takes/${t.id}`}
                  tone="low"
                  title={`${t.reference} — ${t.category_name ?? t.scope}`}
                  subtitle={`${subtitle(t)} · submitted ${relativeDays(t.submitted_at)}`}
                  right={
                    <span
                      className={`tabular font-semibold ${
                        Number(t.variance_value) < 0 ? "text-out" : "text-ok"
                      }`}
                    >
                      {formatMoney(t.variance_value)}
                    </span>
                  }
                  rightSub="variance"
                />
              ))}
            </SectionCard>
          ) : null}

          {counting.length > 0 ? (
            <SectionCard title={`${counting.length} in progress`}>
              {counting.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/stock-takes/${t.id}`}
                  title={`${t.reference} — ${t.category_name ?? t.scope}`}
                  subtitle={`${subtitle(t)} · started ${relativeDays(t.started_at)}`}
                  right={<DocStatusBadge status={t.status ?? "counting"} />}
                />
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title="Completed" empty={done.length === 0}>
            {done.map((t) => (
              <ListRow
                key={t.id}
                href={`/stock-takes/${t.id}`}
                title={`${t.reference} — ${t.category_name ?? t.scope}`}
                subtitle={`${t.site_code} · approved ${relativeDays(t.approved_at)}${
                  t.approved_by_name ? ` by ${t.approved_by_name}` : ""
                }`}
                right={
                  <span
                    className={`tabular font-semibold ${
                      Number(t.variance_value) < 0 ? "text-out" : "text-ok"
                    }`}
                  >
                    {formatMoney(t.variance_value)}
                  </span>
                }
                rightSub={`${t.variance_lines} lines`}
              />
            ))}
          </SectionCard>
        </div>
      )}
    </>
  );
}
