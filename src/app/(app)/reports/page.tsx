import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatMoney, formatQty } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared";

import { ReportsTabs } from "./reports-tabs";

export const dynamic = "force-dynamic";

/**
 * Default movement-export window, resolved per request on the server so the
 * client component never has to read the clock during render.
 */
function defaultRange() {
  const now = Date.now();
  return {
    from: new Date(now - 30 * 86_400_000).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  };
}

export default async function ReportsPage() {
  const session = await getSession();
  const supabase = await createClient();

  let valuationQuery = supabase.from("v_stock_valuation").select("*").order("site_code");
  if (session.siteId) valuationQuery = valuationQuery.eq("site_id", session.siteId);

  const [{ data: valuation }, { data: categories }] = await Promise.all([
    valuationQuery,
    supabase.from("categories").select("id, name, parent_id").order("sort_order"),
  ]);

  const { from: defaultFrom, to: defaultTo } = defaultRange();
  const rows = valuation ?? [];
  const combinedValue = rows.reduce((s, r) => s + Number(r.total_value ?? 0), 0);
  const combinedQty = rows.reduce((s, r) => s + Number(r.total_qty ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Valuation, movement history, dead stock and stock take variances."
      />

      <Card className="mb-4 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {session.site ? `${session.site.name} valuation` : "Combined stock valuation"}
        </p>
        <p className="tabular mt-1 text-3xl font-bold">{formatMoney(combinedValue)}</p>
        <p className="text-sm text-muted-foreground">
          {formatQty(combinedQty)} units across {rows.length} site
          {rows.length === 1 ? "" : "s"}, at weighted average cost
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const share =
              combinedValue > 0 ? (Number(r.total_value) / combinedValue) * 100 : 0;
            return (
              <div key={r.site_id} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{r.site_code}</p>
                  <p className="tabular font-semibold">{formatMoney(r.total_value)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.lines_with_stock} of {r.lines_total} lines carrying stock
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ReportsTabs
        sites={session.sites}
        siteId={session.siteId}
        categories={categories ?? []}
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
      />
    </>
  );
}
