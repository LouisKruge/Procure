import Link from "next/link";
import { notFound } from "next/navigation";
import { Barcode, Tags } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import {
  formatDateTime,
  formatMoney,
  formatQty,
  relativeDays,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import {
  PageHeader,
  QtyWithUom,
  StockStatusBadge,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { AdjustStockDialog } from "./adjust-dialog";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: item }, { data: levels }, { data: movements }, { data: costs }, { data: suppliers }] =
    await Promise.all([
      supabase
        .from("stock_items")
        .select("*, category:categories(name), supplier:suppliers(id, name, lead_time_days)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("v_stock_status")
        .select("*")
        .eq("item_id", id)
        .order("site_code"),
      supabase
        .from("v_movement_log")
        .select("*")
        .eq("item_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("cost_history")
        .select("*")
        .eq("item_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("supplier_items")
        .select("*, supplier:suppliers(name, lead_time_days)")
        .eq("item_id", id)
        .order("is_preferred", { ascending: false }),
    ]);

  if (!item) notFound();

  const rows = levels ?? [];
  const totalOnHand = rows.reduce((s, r) => s + Number(r.qty_on_hand ?? 0), 0);
  const totalInTransit = rows.reduce((s, r) => s + Number(r.qty_in_transit ?? 0), 0);
  const totalOnOrder = rows.reduce((s, r) => s + Number(r.qty_on_order ?? 0), 0);
  const overallStatus =
    totalOnHand <= 0 ? "out" : totalOnHand <= Number(item.reorder_point) ? "low" : "ok";

  const category = item.category as { name?: string } | null;

  return (
    <>
      <RealtimeRefresh />

      <PageHeader
        title={item.sku}
        description={item.description}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/labels?item=${item.id}`}>
                <Tags /> Label
              </Link>
            </Button>
            {session.isManager ? (
              <AdjustStockDialog
                itemId={item.id}
                sku={item.sku}
                uom={item.uom}
                sites={session.sites}
                levels={rows.map((r) => ({
                  site_id: r.site_id!,
                  site_code: r.site_code!,
                  qty_on_hand: Number(r.qty_on_hand ?? 0),
                }))}
              />
            ) : null}
          </div>
        }
      />

      {/* Headline numbers first - this is the "what do I have" answer. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total on hand
          </p>
          <p
            className={`tabular mt-1 text-3xl font-bold ${
              overallStatus === "out"
                ? "text-out"
                : overallStatus === "low"
                  ? "text-low"
                  : ""
            }`}
          >
            {formatQty(totalOnHand)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {item.uom}
            </span>
          </p>
          <StockStatusBadge status={overallStatus} className="mt-2" />
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Average cost
          </p>
          <p className="tabular mt-1 text-2xl font-bold">{formatMoney(item.avg_cost)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Standard {formatMoney(item.standard_cost)}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Reorder at
          </p>
          <p className="tabular mt-1 text-2xl font-bold">
            {formatQty(item.reorder_point)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Order {formatQty(item.reorder_qty)} {item.uom}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Incoming
          </p>
          <p className="tabular mt-1 text-2xl font-bold">
            {formatQty(totalOnOrder + totalInTransit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatQty(totalOnOrder)} on order · {formatQty(totalInTransit)} in transit
          </p>
        </Card>
      </div>

      {/* Per-site breakdown: the thing SYSPRO buries. */}
      <Card className="mt-4 overflow-hidden">
        <CardHeader className="border-b py-3">
          <CardTitle>Stock by site</CardTitle>
        </CardHeader>
        <div className="divide-y">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              This item has no stock records at any site yet.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.level_id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.site_code}{" "}
                    <span className="font-normal text-muted-foreground">
                      {r.site_name}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bin {r.bin_location ?? "—"} · last moved {relativeDays(r.last_movement_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <QtyWithUom
                    qty={r.qty_on_hand}
                    uom={r.uom}
                    className={
                      r.stock_status === "out"
                        ? "text-lg text-out"
                        : r.stock_status === "low"
                          ? "text-lg text-low"
                          : "text-lg"
                    }
                  />
                  {Number(r.qty_in_transit ?? 0) > 0 ? (
                    <p className="text-xs text-transit">
                      +{formatQty(r.qty_in_transit)} in transit
                    </p>
                  ) : null}
                  {Number(r.qty_on_order ?? 0) > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {formatQty(r.qty_on_order)} on order
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Detail label="Category" value={category?.name ?? "Uncategorised"} />
            <Detail label="Unit of measure" value={item.uom} />
            <Detail label="Default bin" value={item.default_bin ?? "—"} />
            <Detail
              label="Barcode"
              value={
                item.barcode ? (
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Barcode className="size-4" />
                    {item.barcode}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            {item.long_description ? (
              <Detail label="Notes" value={item.long_description} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle>Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(suppliers ?? []).length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No supplier linked to this item yet.
                </p>
              ) : (
                (suppliers ?? []).map((s) => {
                  const sup = s.supplier as {
                    name?: string;
                    lead_time_days?: number;
                  } | null;
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium">
                          {sup?.name}
                          {s.is_preferred ? (
                            <Badge variant="ok">Preferred</Badge>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Part {s.supplier_part_no ?? "—"} ·{" "}
                          {s.lead_time_days ?? sup?.lead_time_days ?? 7} day lead time
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold">
                          {formatMoney(s.last_price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.last_price_at ? relativeDays(s.last_price_at) : "no history"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="movements" className="mt-4">
        <TabsList>
          <TabsTrigger value="movements">Movement history</TabsTrigger>
          <TabsTrigger value="costs">Cost history</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card className="overflow-hidden">
            <div className="divide-y">
              {(movements ?? []).length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No movements recorded yet.
                </p>
              ) : (
                (movements ?? []).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {MOVEMENT_LABEL[m.movement_type ?? ""] ?? m.movement_type}
                        {m.reference_no ? (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {m.reference_no}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.site_code} · {m.reason ?? "—"}
                        {m.user_name ? ` · ${m.user_name}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tabular font-semibold ${
                          m.direction === "in" ? "text-ok" : "text-out"
                        }`}
                      >
                        {m.direction === "in" ? "+" : "−"}
                        {formatQty(m.qty)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card className="overflow-hidden">
            <div className="divide-y">
              {(costs ?? []).length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No cost changes recorded yet.
                </p>
              ) : (
                (costs ?? []).map((c) => {
                  const up = Number(c.new_cost) > Number(c.old_cost ?? 0);
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize">{c.cost_type} cost</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {c.reason ?? "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold">
                          {formatMoney(c.old_cost)} → {formatMoney(c.new_cost)}
                        </p>
                        <p
                          className={`text-xs ${up ? "text-out" : "text-ok"}`}
                        >
                          {up ? "▲" : "▼"}{" "}
                          {formatDateTime(c.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

const MOVEMENT_LABEL: Record<string, string> = {
  receipt: "Receipt",
  dispatch: "Dispatch",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
  adjustment: "Adjustment",
  stock_take: "Stock take correction",
};

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
