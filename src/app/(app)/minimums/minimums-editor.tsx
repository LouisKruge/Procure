"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Search, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { formatQty } from "@/lib/utils";

type Category = { id: string; name: string; parent_id: string | null };

type Row = {
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  category_name: string | null;
  bin_location: string | null;
  location: string | null;
  qty_on_hand: number;
  reorder_point: number;
  reorder_qty: number;
};

const ALL = "__all__";
const PAGE = 200;

export function MinimumsEditor({
  categories,
  siteId,
}: {
  categories: Category[];
  siteId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, { min?: string; order?: string }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let q = supabase
      .from("v_stock_status")
      .select(
        "item_id, sku, description, uom, category_name, bin_location, location, qty_on_hand, reorder_point, reorder_qty",
      )
      .order("sku")
      .limit(PAGE);

    if (siteId) q = q.eq("site_id", siteId);
    if (category !== ALL) q = q.eq("category_id", category);
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.or(`sku.ilike.${term},description.ilike.${term},bin_location.ilike.${term}`);
    }

    const { data, error } = await q;
    setLoading(false);

    if (error) return toast.error(friendlyError(error));
    setRows((data as unknown as Row[]) ?? []);
    setSelected(new Set());
  }, [search, category, siteId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const minOf = (r: Row) =>
    edits[r.item_id]?.min ?? String(Number(r.reorder_point) || 0);
  const orderOf = (r: Row) =>
    edits[r.item_id]?.order ?? String(Number(r.reorder_qty) || 0);

  function setEdit(id: string, field: "min" | "order", value: string) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const targets = () => (selected.size > 0 ? rows.filter((r) => selected.has(r.item_id)) : rows);

  function applyFixed() {
    const v = Number(bulkValue);
    if (!Number.isFinite(v) || v < 0) return toast.error("Enter a minimum of zero or more.");
    const t = targets();
    setEdits((e) => {
      const next = { ...e };
      for (const r of t) {
        next[r.item_id] = { min: String(v), order: String(Math.max(v * 2, v)) };
      }
      return next;
    });
    toast.success(`Set ${t.length} line${t.length === 1 ? "" : "s"} to ${v}. Not saved yet.`);
  }

  function applyFromStock(fraction: number) {
    const t = targets();
    setEdits((e) => {
      const next = { ...e };
      for (const r of t) {
        const min = r.qty_on_hand > 0 ? Math.max(1, Math.ceil(r.qty_on_hand * fraction)) : 0;
        next[r.item_id] = { min: String(min), order: String(min * 2) };
      }
      return next;
    });
    toast.success(
      `Set ${t.length} line${t.length === 1 ? "" : "s"} to ${Math.round(fraction * 100)}% of stock on hand. Not saved yet.`,
    );
  }

  async function save() {
    const changed = rows.filter((r) => {
      const e = edits[r.item_id];
      if (!e) return false;
      return (
        (e.min !== undefined && Number(e.min) !== Number(r.reorder_point)) ||
        (e.order !== undefined && Number(e.order) !== Number(r.reorder_qty))
      );
    });

    if (changed.length === 0) return toast.info("Nothing has changed.");

    setSaving(true);
    const supabase = createClient();

    // Values differ per row, so these go one at a time rather than as a
    // single bulk update. Chunked so a big edit does not stall the tablet.
    let done = 0;
    for (const r of changed) {
      const { error } = await supabase
        .from("stock_items")
        .update({
          reorder_point: Number(minOf(r)) || 0,
          reorder_qty: Number(orderOf(r)) || 0,
        })
        .eq("id", r.item_id);

      if (error) {
        setSaving(false);
        return toast.error(
          `Saved ${done} of ${changed.length} — ${friendlyError(error)}`,
        );
      }
      done += 1;
    }

    setSaving(false);
    setEdits({});
    toast.success(`Saved ${done} minimum${done === 1 ? "" : "s"}.`);
    void load();
  }

  const pendingCount = Object.keys(edits).length;

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="min-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="min-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Stock code, description or bin"
              className="pl-11"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.parent_id ? "— " : ""}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="bulk">Set a fixed minimum</Label>
          <Input
            id="bulk"
            type="number"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder="e.g. 20"
            className="w-32"
          />
        </div>
        <Button variant="outline" onClick={applyFixed}>
          <Wand2 /> Apply
        </Button>
        <Button variant="outline" onClick={() => applyFromStock(0.25)}>
          25% of stock
        </Button>
        <Button variant="outline" onClick={() => applyFromStock(0.5)}>
          50% of stock
        </Button>
        <p className="ml-auto text-sm text-muted-foreground">
          Applies to{" "}
          <strong className="text-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `all ${rows.length} shown`}
          </strong>
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-semibold">
            {loading ? "Loading…" : `${rows.length} items`}
            {rows.length === PAGE ? " (first 200 — narrow the search for more)" : ""}
          </p>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        </div>

        <div className="divide-y">
          {rows.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing matched that.
            </p>
          ) : (
            rows.map((r) => {
              const min = Number(minOf(r));
              const dirty =
                edits[r.item_id] &&
                (min !== Number(r.reorder_point) ||
                  Number(orderOf(r)) !== Number(r.reorder_qty));
              return (
                <div
                  key={r.item_id}
                  className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${
                    dirty ? "bg-low-subtle/40" : ""
                  }`}
                >
                  <Checkbox
                    checked={selected.has(r.item_id)}
                    onCheckedChange={() => toggle(r.item_id)}
                    aria-label={`Select ${r.sku}`}
                  />
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <Link
                      href={`/stock/${r.item_id}`}
                      className="font-semibold hover:underline"
                    >
                      {r.sku}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {r.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.category_name ?? "—"} · bin {r.bin_location ?? "—"}
                      {r.location ? ` · ${r.location}` : ""} ·{" "}
                      <span className="font-medium text-foreground">
                        {formatQty(r.qty_on_hand)} {r.uom}
                      </span>{" "}
                      on hand
                    </p>
                  </div>

                  <div className="w-24 shrink-0">
                    <Label className="mb-1 block text-xs">Minimum</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={minOf(r)}
                      onChange={(e) => setEdit(r.item_id, "min", e.target.value)}
                      className="tabular h-11 text-center font-bold"
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <Label className="mb-1 block text-xs">Order qty</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={orderOf(r)}
                      onChange={(e) => setEdit(r.item_id, "order", e.target.value)}
                      className="tabular h-11 text-center"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 p-4 shadow-lg lg:bottom-4">
        <p className="text-sm text-muted-foreground">
          {pendingCount > 0
            ? `${pendingCount} line${pendingCount === 1 ? "" : "s"} edited, not yet saved`
            : "No unsaved changes"}
        </p>
        <Button size="lg" onClick={save} disabled={saving || pendingCount === 0}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save minimums
        </Button>
      </Card>
    </div>
  );
}
