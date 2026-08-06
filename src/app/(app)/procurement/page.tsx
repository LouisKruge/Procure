import Link from "next/link";
import { CheckCircle2, ShoppingCart } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared";

import { ReorderSuggestions } from "./reorder-suggestions";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const session = await getSession();
  const supabase = await createClient();

  let query = supabase
    .from("v_reorder_suggestions")
    .select("*")
    .order("stock_status", { ascending: true })
    .order("sku");

  if (session.siteId) query = query.eq("site_id", session.siteId);

  const [{ data: suggestions }, { data: suppliers }] = await Promise.all([
    query,
    supabase
      .from("suppliers")
      .select("id, code, name, lead_time_days")
      .eq("is_active", true)
      .order("name"),
  ]);

  const rows = suggestions ?? [];

  return (
    <>
      <PageHeader
        title="Procurement"
        description="Everything at or below its reorder point, grouped by supplier."
        action={
          <Button asChild variant="outline">
            <Link href="/procurement/orders">
              <ShoppingCart /> Purchase orders
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          title="Nothing needs ordering"
          description={
            session.site
              ? `Every item at ${session.site.name} is above its reorder point, allowing for stock already on order.`
              : "Every item is above its reorder point, allowing for stock already on order."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/procurement/orders">View purchase orders</Link>
            </Button>
          }
        />
      ) : (
        <ReorderSuggestions
          rows={rows.map((r) => ({
            item_id: r.item_id!,
            site_id: r.site_id!,
            site_code: r.site_code!,
            sku: r.sku!,
            description: r.description!,
            uom: r.uom!,
            category_name: r.category_name,
            qty_on_hand: Number(r.qty_on_hand ?? 0),
            qty_on_order: Number(r.qty_on_order ?? 0),
            reorder_point: Number(r.reorder_point ?? 0),
            suggested_qty: Number(r.suggested_qty ?? 0),
            stock_status: r.stock_status ?? "low",
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name,
            supplier_part_no: r.supplier_part_no,
            unit_price: Number(r.unit_price ?? 0),
            lead_time_days: Number(r.lead_time_days ?? 7),
          }))}
          suppliers={suppliers ?? []}
        />
      )}
    </>
  );
}
