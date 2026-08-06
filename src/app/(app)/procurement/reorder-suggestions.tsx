"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Loader2, PackageX, ShoppingCart, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Label } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { downloadCsv, formatMoney, formatQty, toCsv } from "@/lib/utils";

type Row = {
  item_id: string;
  site_id: string;
  site_code: string;
  sku: string;
  description: string;
  uom: string;
  category_name: string | null;
  qty_on_hand: number;
  qty_on_order: number;
  reorder_point: number;
  suggested_qty: number;
  stock_status: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_part_no: string | null;
  unit_price: number;
  lead_time_days: number;
};

type Supplier = { id: string; code: string; name: string; lead_time_days: number };

const NO_SUPPLIER = "__none__";

/**
 * Suggestions are grouped by supplier because that is how orders actually
 * get placed - one call, one PO. Creating the orders splits the selection
 * into one draft PO per supplier in a single action.
 */
export function ReorderSuggestions({
  rows,
  suppliers,
}: {
  rows: Row[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.map(keyOf)),
  );
  const [qty, setQty] = useState<Record<string, string>>({});
  const [supplierOverride, setSupplierOverride] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, { supplier: string; name: string; rows: Row[] }>();
    for (const row of rows) {
      const id = supplierOverride[keyOf(row)] ?? row.supplier_id ?? NO_SUPPLIER;
      const name =
        suppliers.find((s) => s.id === id)?.name ??
        row.supplier_name ??
        "No supplier linked";
      if (!map.has(id)) map.set(id, { supplier: id, name, rows: [] });
      map.get(id)!.rows.push(row);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, supplierOverride, suppliers]);

  const qtyFor = (row: Row) => {
    const raw = qty[keyOf(row)];
    return raw === undefined || raw === "" ? row.suggested_qty : Number(raw);
  };

  const selectedRows = rows.filter((r) => selected.has(keyOf(r)));
  const totalValue = selectedRows.reduce(
    (s, r) => s + qtyFor(r) * r.unit_price,
    0,
  );

  function toggle(row: Row) {
    const key = keyOf(row);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(groupRows: Row[], on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      for (const r of groupRows) {
        if (on) next.add(keyOf(r));
        else next.delete(keyOf(r));
      }
      return next;
    });
  }

  async function createOrders() {
    if (selectedRows.length === 0) return toast.error("Select at least one line.");

    const missing = selectedRows.filter(
      (r) => (supplierOverride[keyOf(r)] ?? r.supplier_id ?? NO_SUPPLIER) === NO_SUPPLIER,
    );
    if (missing.length > 0) {
      return toast.error(
        `${missing[0].sku} has no supplier. Pick one before raising the order.`,
      );
    }

    // POs are per site, so the selection is split by site as well as supplier.
    const bySite = new Map<string, Row[]>();
    for (const r of selectedRows) {
      if (!bySite.has(r.site_id)) bySite.set(r.site_id, []);
      bySite.get(r.site_id)!.push(r);
    }

    setBusy(true);
    const supabase = createClient();
    let created = 0;

    for (const [siteId, siteRows] of bySite) {
      const { data, error } = await supabase.rpc(
        "create_purchase_orders_from_suggestions",
        {
          p_site_id: siteId,
          p_items: siteRows.map((r) => ({
            item_id: r.item_id,
            qty: qtyFor(r),
            supplier_id: supplierOverride[keyOf(r)] ?? r.supplier_id,
            unit_price: r.unit_price,
          })),
          p_notes: "Raised from reorder suggestions",
        },
      );

      if (error) {
        setBusy(false);
        return toast.error(friendlyError(error));
      }
      created += (data ?? []).length;
    }

    setBusy(false);
    toast.success(
      `${created} draft purchase order${created === 1 ? "" : "s"} created. Review and send.`,
    );
    router.push("/procurement/orders");
  }

  function exportCsv() {
    downloadCsv(
      `reorder-suggestions-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((r) => ({
          site: r.site_code,
          sku: r.sku,
          description: r.description,
          uom: r.uom,
          on_hand: r.qty_on_hand,
          on_order: r.qty_on_order,
          reorder_point: r.reorder_point,
          suggested_qty: qtyFor(r),
          supplier: r.supplier_name ?? "",
          supplier_part_no: r.supplier_part_no ?? "",
          unit_price: r.unit_price,
          line_value: (qtyFor(r) * r.unit_price).toFixed(2),
        })),
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="out">
          <PackageX className="size-3" />
          {rows.filter((r) => r.stock_status === "out").length} stocked out
        </Badge>
        <Badge variant="low">
          <TrendingDown className="size-3" />
          {rows.filter((r) => r.stock_status !== "out").length} below reorder
        </Badge>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download /> Export
        </Button>
      </div>

      {groups.map((group) => {
        const allOn = group.rows.every((r) => selected.has(keyOf(r)));
        const groupValue = group.rows
          .filter((r) => selected.has(keyOf(r)))
          .reduce((s, r) => s + qtyFor(r) * r.unit_price, 0);

        return (
          <Card key={group.supplier} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
              <Checkbox
                checked={allOn}
                onCheckedChange={(v) => toggleGroup(group.rows, Boolean(v))}
                aria-label={`Select all from ${group.name}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.rows.length} line{group.rows.length === 1 ? "" : "s"} ·{" "}
                  {group.rows[0]?.lead_time_days ?? 7} day lead time
                </p>
              </div>
              <p className="tabular font-semibold">{formatMoney(groupValue)}</p>
            </div>

            <div className="divide-y">
              {group.rows.map((row) => {
                const key = keyOf(row);
                const isOut = row.stock_status === "out";
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={() => toggle(row)}
                      aria-label={`Order ${row.sku}`}
                    />

                    <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                      <Link
                        href={`/stock/${row.item_id}`}
                        className="truncate font-semibold hover:underline"
                      >
                        {row.sku}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {row.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.site_code} ·{" "}
                        <span className={isOut ? "font-medium text-out" : "text-low"}>
                          {formatQty(row.qty_on_hand)} on hand
                        </span>{" "}
                        · reorder at {formatQty(row.reorder_point)}
                        {row.qty_on_order > 0
                          ? ` · ${formatQty(row.qty_on_order)} already on order`
                          : ""}
                      </p>
                      {group.supplier === NO_SUPPLIER ? (
                        <div className="mt-2 max-w-xs">
                          <Label className="mb-1 block text-xs">Choose a supplier</Label>
                          <Select
                            value={supplierOverride[key] ?? ""}
                            onValueChange={(v) =>
                              setSupplierOverride((o) => ({ ...o, [key]: v }))
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-24 shrink-0">
                      <Label className="mb-1 block text-xs">Order</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={qty[key] ?? String(row.suggested_qty)}
                        onChange={(e) => setQty((q) => ({ ...q, [key]: e.target.value }))}
                        className="tabular h-11 text-center font-bold"
                      />
                    </div>

                    <div className="w-24 shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(row.unit_price)} ea
                      </p>
                      <p className="tabular font-semibold">
                        {formatMoney(qtyFor(row) * row.unit_price)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <Card className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 p-4 shadow-lg lg:bottom-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {selectedRows.length} line{selectedRows.length === 1 ? "" : "s"} selected
          </p>
          <p className="tabular text-lg font-bold">{formatMoney(totalValue)}</p>
        </div>
        <Button size="lg" onClick={createOrders} disabled={busy || selectedRows.length === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
          Create purchase orders
        </Button>
      </Card>
    </div>
  );
}

function keyOf(row: Row) {
  return `${row.site_id}:${row.item_id}`;
}
