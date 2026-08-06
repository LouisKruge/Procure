import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge, PageHeader } from "@/components/shared";

import { CountSheet } from "./count-sheet";

export const dynamic = "force-dynamic";

export default async function StockTakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: take }, { data: lines }] = await Promise.all([
    supabase.from("v_stock_take_summary").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("stock_take_lines")
      .select("*, item:stock_items(id, sku, description, uom, barcode)")
      .eq("stock_take_id", id)
      .order("bin_location", { nullsFirst: false }),
  ]);

  if (!take) notFound();

  const rows = (lines ?? []).map((l) => {
    const item = l.item as {
      id: string;
      sku: string;
      description: string;
      uom: string;
      barcode: string | null;
    };
    return {
      line_id: l.id,
      item_id: item.id,
      sku: item.sku,
      description: item.description,
      uom: item.uom,
      barcode: item.barcode,
      bin: l.bin_location,
      expected_qty: Number(l.expected_qty),
      counted_qty: l.counted_qty === null ? null : Number(l.counted_qty),
      unit_cost: Number(l.unit_cost),
    };
  });

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/stock-takes">
            <ArrowLeft /> Stock takes
          </Link>
        </Button>
      </div>

      <PageHeader
        title={take.reference ?? "Stock take"}
        description={`${take.site_name} · ${
          take.category_name ??
          (take.scope === "bin_range"
            ? `bins ${take.bin_from} – ${take.bin_to}`
            : "full count")
        }`}
        action={<DocStatusBadge status={take.status ?? "counting"} />}
      />

      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Meta label="Lines" value={String(take.line_count ?? 0)} />
        <Meta
          label="Counted"
          value={`${take.counted_count ?? 0} of ${take.line_count ?? 0}`}
        />
        <Meta
          label="Lines out"
          value={String(take.variance_lines ?? 0)}
          tone={Number(take.variance_lines) > 0 ? "low" : undefined}
        />
        <Meta
          label="Variance value"
          value={formatMoney(take.variance_value)}
          tone={Number(take.variance_value) < 0 ? "out" : undefined}
        />
        <Meta label="Started" value={formatDateTime(take.started_at)} />
        <Meta label="Started by" value={take.started_by_name || "—"} />
        <Meta
          label="Submitted"
          value={take.submitted_at ? formatDateTime(take.submitted_at) : "—"}
        />
        <Meta
          label="Approved"
          value={
            take.approved_at
              ? `${formatDateTime(take.approved_at)}${
                  take.approved_by_name ? ` · ${take.approved_by_name}` : ""
                }`
              : "—"
          }
        />
      </Card>

      {take.notes ? (
        <Card className="mb-4 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="mt-1">{take.notes}</p>
        </Card>
      ) : null}

      <CountSheet
        takeId={id}
        reference={take.reference ?? ""}
        status={take.status ?? "counting"}
        siteCode={take.site_code ?? ""}
        canApprove={session.isManager}
        lines={rows}
      />
    </>
  );
}

function Meta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "low" | "out";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`font-semibold ${
          tone === "out" ? "text-out" : tone === "low" ? "text-low" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
