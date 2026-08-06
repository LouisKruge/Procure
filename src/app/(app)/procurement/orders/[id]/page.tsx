import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackagePlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDate, formatMoney, formatQty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge, PageHeader } from "@/components/shared";

import { SendPoButton } from "./send-button";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSession();
  const supabase = await createClient();

  const [{ data: po }, { data: lines }] = await Promise.all([
    supabase.from("v_purchase_order_summary").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("purchase_order_lines")
      .select("*, item:stock_items(id, sku, description, uom)")
      .eq("purchase_order_id", id)
      .order("line_no"),
  ]);

  if (!po) notFound();

  const rows = (lines ?? []) as unknown as {
    id: string;
    line_no: number;
    qty_ordered: number;
    qty_received: number;
    unit_price: number;
    supplier_part_no: string | null;
    item: { id: string; sku: string; description: string; uom: string };
  }[];

  const receivable = po.status === "sent" || po.status === "partially_received";

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/procurement/orders">
            <ArrowLeft /> Purchase orders
          </Link>
        </Button>
      </div>

      <PageHeader
        title={po.po_number ?? "Purchase order"}
        description={`${po.supplier_name} · delivering to ${po.site_name}`}
        action={
          <div className="flex items-center gap-2">
            <DocStatusBadge status={po.status ?? "draft"} />
            {po.status === "draft" ? <SendPoButton poId={id} /> : null}
            {receivable ? (
              <Button asChild size="sm">
                <Link href={`/receiving/${id}`}>
                  <PackagePlus /> Receive
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Meta label="Ordered" value={formatDate(po.order_date)} />
        <Meta
          label="Expected"
          value={formatDate(po.expected_date)}
          tone={po.is_overdue ? "low" : undefined}
        />
        <Meta label="Lines" value={String(po.line_count ?? 0)} />
        <Meta label="Order value" value={formatMoney(po.total_value)} />
        <Meta label="Ordered qty" value={formatQty(po.total_ordered)} />
        <Meta label="Received qty" value={formatQty(po.total_received)} />
        <Meta label="Outstanding" value={formatQty(po.outstanding_qty)} />
        <Meta label="Lead time" value={`${po.lead_time_days ?? 7} days`} />
      </Card>

      {po.notes ? (
        <Card className="mb-4 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="mt-1">{po.notes}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="divide-y">
          {rows.map((line) => {
            const outstanding = Number(line.qty_ordered) - Number(line.qty_received);
            return (
              <Link
                key={line.id}
                href={`/stock/${line.item.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.item.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {line.item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supplier part {line.supplier_part_no ?? "—"} ·{" "}
                    {formatMoney(line.unit_price)} each
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-semibold">
                    {formatQty(line.qty_ordered)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {line.item.uom}
                    </span>
                  </p>
                  <p
                    className={`text-xs ${
                      outstanding > 0 ? "text-low" : "text-ok"
                    }`}
                  >
                    {outstanding > 0
                      ? `${formatQty(outstanding)} outstanding`
                      : "complete"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
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
  tone?: "low";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-semibold ${tone === "low" ? "text-low" : ""}`}>{value}</p>
    </div>
  );
}
