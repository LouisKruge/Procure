import Link from "next/link";

import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatQty } from "@/lib/utils";

import { StockCatalogue } from "./catalogue";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const session = await getSession();
  const supabase = await createClient();

  // Filter options and the headline totals. The catalogue itself pages
  // through Postgres rather than loading the range up front.
  let locationQuery = supabase
    .from("v_stock_status")
    .select("location")
    .not("location", "is", null)
    .limit(2000);
  if (session.siteId) locationQuery = locationQuery.eq("site_id", session.siteId);

  let valuationQuery = supabase
    .from("v_stock_valuation")
    .select("total_value, total_qty, lines_total, lines_with_stock");
  if (session.siteId) valuationQuery = valuationQuery.eq("site_id", session.siteId);

  const [{ data: categories }, { data: locationRows }, { data: valuation }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, parent_id")
        .order("sort_order")
        .order("name"),
      locationQuery,
      valuationQuery,
    ]);

  const locations = [
    ...new Set((locationRows ?? []).map((r) => r.location).filter(Boolean) as string[]),
  ].sort();

  const val = valuation ?? [];
  const totalValue = val.reduce((s, r) => s + Number(r.total_value ?? 0), 0);
  const totalQty = val.reduce((s, r) => s + Number(r.total_qty ?? 0), 0);
  const linesTotal = val.reduce((s, r) => s + Number(r.lines_total ?? 0), 0);
  const linesStocked = val.reduce((s, r) => s + Number(r.lines_with_stock ?? 0), 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold leading-none tracking-[-0.02em]">
            Stock
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
            {session.site ? session.site.name : "All sites"} · everything you hold
          </p>
        </div>

        {linesTotal > 0 ? (
          <div className="flex items-center gap-6">
            <Figure label="Lines" value={formatQty(linesTotal)} sub={`${formatQty(linesStocked)} with stock`} />
            <Figure label="Units" value={formatQty(totalQty)} />
            <Figure label="Value" value={formatMoney(totalValue)} />
          </div>
        ) : (
          <Link
            href="/import"
            className="flex h-9 items-center rounded-[var(--r-md)] bg-[var(--brass)] px-3.5 text-[13px] font-medium text-[#0B0A08] transition-colors hover:bg-[var(--brass-bright)]"
          >
            Import your stock
          </Link>
        )}
      </div>

      <StockCatalogue
        categories={categories ?? []}
        locations={locations}
        siteId={session.siteId}
      />
    </>
  );
}

function Figure({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="text-right">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-quaternary)]">
        {label}
      </p>
      <p className="num mt-0.5 text-[17px] font-semibold">{value}</p>
      {sub ? <p className="text-[11px] text-[var(--text-quaternary)]">{sub}</p> : null}
    </div>
  );
}
