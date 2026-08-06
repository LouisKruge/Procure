"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import {
  downloadCsv,
  formatDate,
  formatMoney,
  formatQty,
  relativeDays,
  toCsv,
} from "@/lib/utils";
import type { Site } from "@/lib/session";

type Category = { id: string; name: string; parent_id: string | null };

const ALL = "__all__";

export function ReportsTabs({
  sites,
  siteId,
  categories,
  defaultFrom,
  defaultTo,
}: {
  sites: Site[];
  siteId: string | null;
  categories: Category[];
  defaultFrom: string;
  defaultTo: string;
}) {
  return (
    <Tabs defaultValue="movements">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="movements" className="flex-1">
          Movements
        </TabsTrigger>
        <TabsTrigger value="dead" className="flex-1">
          Dead stock
        </TabsTrigger>
        <TabsTrigger value="valuation" className="flex-1">
          Valuation
        </TabsTrigger>
        <TabsTrigger value="variances" className="flex-1">
          Variances
        </TabsTrigger>
      </TabsList>

      <TabsContent value="movements">
        <MovementExport
          sites={sites}
          siteId={siteId}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
        />
      </TabsContent>
      <TabsContent value="dead">
        <DeadStock sites={sites} siteId={siteId} />
      </TabsContent>
      <TabsContent value="valuation">
        <ValuationExport sites={sites} siteId={siteId} categories={categories} />
      </TabsContent>
      <TabsContent value="variances">
        <VarianceHistory sites={sites} siteId={siteId} />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------------------------------- movement export */

function MovementExport({
  sites,
  siteId,
  defaultFrom,
  defaultTo,
}: {
  sites: Site[];
  siteId: string | null;
  defaultFrom: string;
  defaultTo: string;
}) {
  // The default range is resolved on the server and passed in, so no clock is
  // read during render.
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [site, setSite] = useState(siteId ?? ALL);
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);

  async function run(download: boolean) {
    setBusy(true);
    const supabase = createClient();

    let query = supabase
      .from("v_movement_log")
      .select("*")
      .gte("created_at", `${from}T00:00:00`)
      // The end date is inclusive - a user picking "to 6 Aug" means all of
      // the 6th, not up to midnight at its start.
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(download ? 5000 : 25);

    if (site !== ALL) query = query.eq("site_id", site);
    if (sku.trim()) query = query.ilike("sku", `%${sku.trim()}%`);

    const { data, error } = await query;
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    const rows = (data ?? []).map((m) => ({
      date: m.created_at,
      site: m.site_code,
      sku: m.sku,
      description: m.description,
      uom: m.uom,
      type: m.movement_type,
      direction: m.direction,
      qty: m.qty,
      qty_after: m.qty_after,
      unit_cost: m.unit_cost,
      value: m.movement_value,
      reason: m.reason,
      reference: m.reference_no,
      user: m.user_name,
    }));

    if (download) {
      if (rows.length === 0) return toast.info("No movements in that range.");
      downloadCsv(`movements-${from}-to-${to}.csv`, toCsv(rows));
      toast.success(`Exported ${rows.length} movements.`);
    } else {
      setPreview(rows);
      if (rows.length === 0) toast.info("No movements in that range.");
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sku">Stock code contains</Label>
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => run(false)} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null} Preview
        </Button>
        <Button onClick={() => run(true)} disabled={busy}>
          <Download /> Export CSV
        </Button>
      </div>

      {preview.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <Th>Date</Th>
                <Th>Site</Th>
                <Th>Item</Th>
                <Th>Type</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Value</Th>
                <Th>User</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.map((r, i) => (
                <tr key={i}>
                  <Td>{formatDate(r.date as string)}</Td>
                  <Td>{String(r.site)}</Td>
                  <Td className="max-w-[14rem] truncate">{String(r.sku)}</Td>
                  <Td>{String(r.type)}</Td>
                  <Td className="tabular text-right">
                    <span className={r.direction === "in" ? "text-ok" : "text-out"}>
                      {r.direction === "in" ? "+" : "−"}
                      {formatQty(r.qty as number)}
                    </span>
                  </Td>
                  <Td className="tabular text-right">
                    {formatMoney(r.value as number)}
                  </Td>
                  <Td className="max-w-[10rem] truncate">
                    {(r.user as string) ?? "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Showing the first {preview.length}. Export for the full range.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------ dead stock */

type DeadRow = {
  item_id: string;
  sku: string;
  description: string;
  category_name: string | null;
  site_code: string;
  bin_location: string | null;
  qty_on_hand: number;
  avg_cost: number;
  stock_value: number;
  last_movement_at: string | null;
  days_since_movement: number | null;
};

function DeadStock({ sites, siteId }: { sites: Site[]; siteId: string | null }) {
  const [days, setDays] = useState("90");
  const [site, setSite] = useState(siteId ?? ALL);
  const [rows, setRows] = useState<DeadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);

  async function run() {
    setBusy(true);
    const { data, error } = await createClient().rpc("dead_stock", {
      p_days: Number(days) || 90,
      p_site_id: site === ALL ? undefined : site,
    });
    setBusy(false);
    setRan(true);

    if (error) return toast.error(friendlyError(error));
    setRows((data as DeadRow[]) ?? []);
  }

  const totalValue = rows.reduce((s, r) => s + Number(r.stock_value ?? 0), 0);

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="days">No movement for at least (days)</Label>
          <Input
            id="days"
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={run} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Run
          </Button>
          {rows.length > 0 ? (
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `dead-stock-${days}-days.csv`,
                  toCsv(rows as unknown as Record<string, unknown>[]),
                )
              }
            >
              <Download /> CSV
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{rows.length} lines</strong> holding{" "}
            <strong className="text-foreground">{formatMoney(totalValue)}</strong> have
            not moved in {days} days.
          </p>

          <div className="divide-y rounded-lg border">
            {rows.slice(0, 100).map((r) => (
              <Link
                key={`${r.item_id}-${r.site_code}`}
                href={`/stock/${r.item_id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.site_code} · bin {r.bin_location ?? "—"} · last moved{" "}
                    {relativeDays(r.last_movement_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-semibold">
                    {formatMoney(r.stock_value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(r.qty_on_hand)} units
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : ran && !busy ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing has been sitting still that long. Good sign.
        </p>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------ valuation export */

function ValuationExport({
  sites,
  siteId,
  categories,
}: {
  sites: Site[];
  siteId: string | null;
  categories: Category[];
}) {
  const [site, setSite] = useState(siteId ?? ALL);
  const [category, setCategory] = useState(ALL);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    let query = createClient()
      .from("v_stock_status")
      .select("*")
      .order("site_code")
      .order("sku")
      .limit(5000);

    if (site !== ALL) query = query.eq("site_id", site);
    if (category !== ALL) query = query.eq("category_id", category);

    const { data, error } = await query;
    setBusy(false);

    if (error) return toast.error(friendlyError(error));
    if (!data || data.length === 0) return toast.info("Nothing to export.");

    downloadCsv(
      `stock-valuation-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        data.map((r) => ({
          site: r.site_code,
          sku: r.sku,
          description: r.description,
          category: r.category_name,
          uom: r.uom,
          bin: r.bin_location,
          qty_on_hand: r.qty_on_hand,
          qty_on_order: r.qty_on_order,
          qty_in_transit: r.qty_in_transit,
          avg_cost: r.avg_cost,
          standard_cost: r.standard_cost,
          stock_value: r.stock_value,
          reorder_point: r.reorder_point,
          status: r.stock_status,
        })),
      ),
    );
    toast.success(`Exported ${data.length} lines.`);
  }

  return (
    <Card className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        Full line-by-line valuation at weighted average cost, per site and item.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sites (combined)</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <div className="flex items-end">
          <Button onClick={exportCsv} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            Export valuation
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------- stock take variance */

type TakeRow = {
  id: string;
  reference: string;
  site_code: string;
  status: string;
  approved_at: string | null;
  started_at: string | null;
  variance_lines: number;
  variance_qty: number;
  variance_value: number;
  approved_by_name: string | null;
  line_count: number;
};

function VarianceHistory({ sites, siteId }: { sites: Site[]; siteId: string | null }) {
  const [site, setSite] = useState(siteId ?? ALL);
  const [rows, setRows] = useState<TakeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);

  async function run() {
    setBusy(true);
    let query = createClient()
      .from("v_stock_take_summary")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);

    if (site !== ALL) query = query.eq("site_id", site);

    const { data, error } = await query;
    setBusy(false);
    setRan(true);

    if (error) return toast.error(friendlyError(error));
    setRows((data as unknown as TakeRow[]) ?? []);
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button onClick={run} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Load history
          </Button>
          {rows.length > 0 ? (
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "stock-take-variances.csv",
                  toCsv(rows as unknown as Record<string, unknown>[]),
                )
              }
            >
              <Download /> CSV
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/stock-takes/${r.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {r.reference} — {r.site_code}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.status === "approved"
                    ? `Approved ${relativeDays(r.approved_at)}${
                        r.approved_by_name ? ` by ${r.approved_by_name}` : ""
                      }`
                    : `${r.status.replace("_", " ")} · started ${relativeDays(r.started_at)}`}{" "}
                  · {r.variance_lines} of {r.line_count} lines out
                </p>
              </div>
              <p
                className={`tabular shrink-0 font-semibold ${
                  Number(r.variance_value) < 0
                    ? "text-out"
                    : Number(r.variance_value) > 0
                      ? "text-ok"
                      : ""
                }`}
              >
                {formatMoney(r.variance_value)}
              </p>
            </Link>
          ))}
        </div>
      ) : ran && !busy ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No stock takes recorded for that site yet.
        </p>
      ) : null}
    </Card>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
