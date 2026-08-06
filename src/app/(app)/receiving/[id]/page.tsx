import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDate, formatMoney, formatQty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge, PageHeader } from "@/components/shared";

import { ReceiveForm } from "./receive-form";

export const dynamic = "force-dynamic";

export default async function ReceivePoPage({
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
      .select("*, item:stock_items(id, sku, description, uom, barcode, default_bin)")
      .eq("purchase_order_id", id)
      .order("line_no"),
  ]);

  if (!po) notFound();

  const rows = (lines ?? []).map((l) => {
    const item = l.item as {
      id: string;
      sku: string;
      description: string;
      uom: string;
      barcode: string | null;
      default_bin: string | null;
    };
    return {
      line_id: l.id,
      item_id: item.id,
      sku: item.sku,
      description: item.description,
      uom: item.uom,
      barcode: item.barcode,
      bin: item.default_bin,
      qty_ordered: Number(l.qty_ordered),
      qty_received: Number(l.qty_received),
      unit_price: Number(l.unit_price),
    };
  });

  const receivable = po.status === "sent" || po.status === "partially_received";

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/receiving">
            <ArrowLeft /> Receiving
          </Link>
        </Button>
      </div>

      <PageHeader
        title={po.po_number ?? "Purchase order"}
        description={`${po.supplier_name} · delivering to ${po.site_name}`}
        action={<DocStatusBadge status={po.status ?? "sent"} />}
      />

      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Meta label="Ordered" value={formatDate(po.order_date)} />
        <Meta
          label="Expected"
          value={formatDate(po.expected_date)}
          tone={po.is_overdue ? "low" : undefined}
        />
        <Meta label="Order value" value={formatMoney(po.total_value)} />
        <Meta
          label="Outstanding"
          value={`${formatQty(po.outstanding_qty)} of ${formatQty(po.total_ordered)}`}
        />
      </Card>

      {receivable ? (
        <ReceiveForm poId={id} poNumber={po.po_number ?? ""} lines={rows} />
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          This purchase order is {po.status} and cannot be received against.
        </Card>
      )}
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
