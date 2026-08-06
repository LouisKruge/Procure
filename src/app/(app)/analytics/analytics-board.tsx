"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  cn,
  downloadCsv,
  formatMoney,
  formatQty,
  relativeDays,
  toCsv,
} from "@/lib/utils";

type UsageRow = {
  item_id: string;
  sku: string;
  description: string;
  category_name: string | null;
  group_name: string | null;
  bin_location: string | null;
  location: string | null;
  uom: string;
  qty_on_hand: number;
  avg_cost: number;
  stock_value: number;
  reorder_point: number;
  qty_issued: number;
  qty_received: number;
  issue_events: number;
  issued_value: number;
  avg_per_week: number;
  avg_per_month: number;
  days_cover: number | null;
  last_issued_at: string | null;
  turnover_rate: number;
};

type PeriodRow = {
  period_start: string;
  period_label: string;
  qty_issued: number;
  qty_received: number;
  issued_value: number;
  received_value: number;
  issue_events: number;
  receipt_events: number;
  items_touched: number;
};

type CategoryRow = {
  category_id: string | null;
  category_name: string;
  group_name: string;
  lines: number;
  qty_on_hand: number;
  stock_value: number;
  qty_issued: number;
  issued_value: number;
  lines_moving: number;
  lines_dead: number;
};

type OrderedRow = {
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  qty_ordered: number;
  qty_received: number;
  qty_issued: number;
  qty_on_hand: number;
  order_count: number;
  balance: number;
};

const WINDOWS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
];

export function AnalyticsBoard({ siteId }: { siteId: string | null }) {
  const [days, setDays] = useState("90");
  const [bucket, setBucket] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [ordered, setOrdered] = useState<OrderedRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const site = siteId ?? undefined;
    const d = Number(days);

    const [u, p, c, o] = await Promise.all([
      supabase.rpc("item_usage_stats", { p_days: d, p_site_id: site, p_limit: 1000 }),
      supabase.rpc("usage_by_period", {
        p_bucket: bucket,
        p_periods: bucket === "week" ? 12 : 12,
        p_site_id: site,
      }),
      supabase.rpc("usage_by_category", { p_days: d, p_site_id: site }),
      supabase.rpc("ordered_vs_used", { p_days: d, p_site_id: site, p_limit: 200 }),
    ]);

    setLoading(false);

    const err = u.error || p.error || c.error || o.error;
    if (err) return toast.error(friendlyError(err));

    setUsage((u.data as UsageRow[]) ?? []);
    setPeriods((p.data as PeriodRow[]) ?? []);
    setCategories((c.data as CategoryRow[]) ?? []);
    setOrdered((o.data as OrderedRow[]) ?? []);
  }, [days, bucket, siteId]);

  // Deferred by a tick so the fetch (and its setState calls) happen after the
  // effect returns rather than synchronously inside it.
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const moving = usage.filter((r) => r.qty_issued > 0);
  const dead = usage.filter((r) => r.qty_issued === 0 && r.qty_on_hand > 0);
  const totalIssuedValue = moving.reduce((s, r) => s + Number(r.issued_value), 0);
  const totalStockValue = usage.reduce((s, r) => s + Number(r.stock_value), 0);
  const deadValue = dead.reduce((s, r) => s + Number(r.stock_value), 0);
  const runningOut = moving
    .filter((r) => r.days_cover !== null && r.days_cover <= 21)
    .sort((a, b) => (a.days_cover ?? 0) - (b.days_cover ?? 0));

  const noHistory = moving.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Period</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Group by</Label>
          <Tabs value={bucket} onValueChange={(v) => setBucket(v as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <Loader2 className="mb-2 size-5 animate-spin text-muted-foreground" />
        ) : null}

        <Button
          variant="outline"
          size="sm"
          className="mb-0.5 ml-auto"
          onClick={() =>
            downloadCsv(
              `usage-${days}-days.csv`,
              toCsv(usage as unknown as Record<string, unknown>[]),
            )
          }
          disabled={usage.length === 0}
        >
          <Download /> Export all
        </Button>
      </div>

      {noHistory && !loading ? (
        <p className="rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          No stock has been booked out yet, so usage figures are all zero. They
          fill in from the first dispatch — the stock list, valuation and dead
          stock below work from day one.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Used in period" value={formatMoney(totalIssuedValue)} sub={`${formatQty(moving.reduce((s, r) => s + Number(r.qty_issued), 0))} units`} />
        <Tile label="Lines moving" value={moving.length} sub={`of ${usage.length} stocked`} tone={moving.length > 0 ? "ok" : undefined} />
        <Tile label="Dead lines" value={dead.length} sub={formatMoney(deadValue)} tone={dead.length > 0 ? "low" : undefined} />
        <Tile label="Running out" value={runningOut.length} sub="under 3 weeks cover" tone={runningOut.length > 0 ? "out" : undefined} />
        <Tile label="Stock value" value={formatMoney(totalStockValue)} sub={`${usage.length} lines`} />
      </div>

      <PeriodChart rows={periods} bucket={bucket} />

      <Tabs defaultValue="fast">
        <TabsList className="w-full flex-wrap sm:w-auto">
          <TabsTrigger value="fast">Fast movers</TabsTrigger>
          <TabsTrigger value="cover">Running out</TabsTrigger>
          <TabsTrigger value="dead">Dead stock</TabsTrigger>
          <TabsTrigger value="category">By category</TabsTrigger>
          <TabsTrigger value="ordered">Ordered vs used</TabsTrigger>
        </TabsList>

        <TabsContent value="fast">
          <UsageTable
            rows={moving.slice(0, 100)}
            days={Number(days)}
            empty="Nothing has been issued in this period yet."
          />
        </TabsContent>

        <TabsContent value="cover">
          <UsageTable
            rows={runningOut.slice(0, 100)}
            days={Number(days)}
            empty="Nothing is due to run out within three weeks at the current rate."
            highlightCover
          />
        </TabsContent>

        <TabsContent value="dead">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <p className="font-semibold">
                {dead.length} lines with stock but no issues in {days} days
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    `dead-stock-${days}-days.csv`,
                    toCsv(dead as unknown as Record<string, unknown>[]),
                  )
                }
                disabled={dead.length === 0}
              >
                <Download /> CSV
              </Button>
            </div>
            <div className="divide-y">
              {dead.length === 0 ? (
                <Empty>Everything you hold has moved in this period.</Empty>
              ) : (
                dead
                  .slice()
                  .sort((a, b) => Number(b.stock_value) - Number(a.stock_value))
                  .slice(0, 100)
                  .map((r) => (
                    <Link
                      key={r.item_id}
                      href={`/stock/${r.item_id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{r.sku}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {r.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.category_name ?? "—"} · bin {r.bin_location ?? "—"}
                          {r.location ? ` · ${r.location}` : ""} · last issued{" "}
                          {relativeDays(r.last_issued_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold">
                          {formatMoney(r.stock_value)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatQty(r.qty_on_hand)} {r.uom}
                        </p>
                      </div>
                    </Link>
                  ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="category">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <Th>Category</Th>
                    <Th className="text-right">Lines</Th>
                    <Th className="text-right">On hand</Th>
                    <Th className="text-right">Stock value</Th>
                    <Th className="text-right">Used</Th>
                    <Th className="text-right">Used value</Th>
                    <Th className="text-right">Moving</Th>
                    <Th className="text-right">Dead</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <Empty>No categories yet.</Empty>
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={`${c.group_name}-${c.category_name}`}>
                        <Td>
                          <span className="font-medium">{c.category_name}</span>
                          {c.group_name !== c.category_name ? (
                            <span className="block text-xs text-muted-foreground">
                              {c.group_name}
                            </span>
                          ) : null}
                        </Td>
                        <Td className="tabular text-right">{c.lines}</Td>
                        <Td className="tabular text-right">{formatQty(c.qty_on_hand)}</Td>
                        <Td className="tabular text-right">{formatMoney(c.stock_value)}</Td>
                        <Td className="tabular text-right">{formatQty(c.qty_issued)}</Td>
                        <Td className="tabular text-right">{formatMoney(c.issued_value)}</Td>
                        <Td className="tabular text-right text-ok">{c.lines_moving}</Td>
                        <Td className="tabular text-right text-low">{c.lines_dead}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ordered">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <Th>Item</Th>
                    <Th className="text-right">Ordered</Th>
                    <Th className="text-right">Received</Th>
                    <Th className="text-right">Used</Th>
                    <Th className="text-right">On hand</Th>
                    <Th className="text-right">Received − used</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ordered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <Empty>
                          Nothing ordered or issued in this period yet.
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    ordered.map((r) => (
                      <tr key={r.item_id}>
                        <Td>
                          <Link
                            href={`/stock/${r.item_id}`}
                            className="font-medium hover:underline"
                          >
                            {r.sku}
                          </Link>
                          <span className="block max-w-[18rem] truncate text-xs text-muted-foreground">
                            {r.description}
                          </span>
                        </Td>
                        <Td className="tabular text-right">{formatQty(r.qty_ordered)}</Td>
                        <Td className="tabular text-right">{formatQty(r.qty_received)}</Td>
                        <Td className="tabular text-right">{formatQty(r.qty_issued)}</Td>
                        <Td className="tabular text-right">{formatQty(r.qty_on_hand)}</Td>
                        <Td
                          className={cn(
                            "tabular text-right font-semibold",
                            Number(r.balance) < 0 ? "text-out" : "text-ok",
                          )}
                        >
                          {Number(r.balance) > 0 ? "+" : ""}
                          {formatQty(r.balance)}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------ components */

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "ok" | "low" | "out";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-2xl font-bold",
          tone === "ok" && "text-ok",
          tone === "low" && "text-low",
          tone === "out" && "text-out",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

/**
 * Received against issued, per period. Two bars per bucket rather than a
 * stack, because the question is "am I putting in more than I take out",
 * which needs the two read side by side.
 */
function PeriodChart({ rows, bucket }: { rows: PeriodRow[]; bucket: string }) {
  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(Number(r.qty_issued), Number(r.qty_received))),
  );
  const hasData = rows.some(
    (r) => Number(r.qty_issued) > 0 || Number(r.qty_received) > 0,
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Received vs used by {bucket}</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-ok" /> Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Used
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No movements recorded in these periods yet.
        </p>
      ) : (
        <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ height: 160 }}>
          {rows.map((r) => {
            const inH = (Number(r.qty_received) / max) * 120;
            const outH = (Number(r.qty_issued) / max) * 120;
            return (
              <div
                key={r.period_start}
                className="flex min-w-[3.2rem] flex-1 flex-col items-center gap-1"
                title={`${r.period_label}\nReceived ${formatQty(r.qty_received)} (${formatMoney(r.received_value)})\nUsed ${formatQty(r.qty_issued)} (${formatMoney(r.issued_value)})`}
              >
                <div className="flex h-[120px] w-full items-end justify-center gap-0.5">
                  <div
                    className="w-1/2 rounded-t-sm bg-ok"
                    style={{ height: Math.max(inH, Number(r.qty_received) > 0 ? 2 : 0) }}
                  />
                  <div
                    className="w-1/2 rounded-t-sm bg-primary"
                    style={{ height: Math.max(outH, Number(r.qty_issued) > 0 ? 2 : 0) }}
                  />
                </div>
                <span className="whitespace-nowrap text-[0.65rem] text-muted-foreground">
                  {r.period_label.replace("w/c ", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function UsageTable({
  rows,
  days,
  empty,
  highlightCover,
}: {
  rows: UsageRow[];
  days: number;
  empty: string;
  highlightCover?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <Th>Item</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Used ({days}d)</Th>
              <Th className="text-right">Per week</Th>
              <Th className="text-right">Per month</Th>
              <Th className="text-right">Cover</Th>
              <Th className="text-right">Value used</Th>
              <Th>Last issued</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <Empty>{empty}</Empty>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const cover = r.days_cover;
                const critical = cover !== null && cover <= 7;
                return (
                  <tr key={r.item_id}>
                    <Td>
                      <Link
                        href={`/stock/${r.item_id}`}
                        className="font-medium hover:underline"
                      >
                        {r.sku}
                      </Link>
                      <span className="block max-w-[20rem] truncate text-xs text-muted-foreground">
                        {r.description}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {r.category_name ?? "—"} · bin {r.bin_location ?? "—"}
                        {r.location ? ` · ${r.location}` : ""}
                      </span>
                    </Td>
                    <Td className="tabular text-right">
                      {formatQty(r.qty_on_hand)}
                      <span className="ml-1 text-xs text-muted-foreground">{r.uom}</span>
                    </Td>
                    <Td className="tabular text-right font-semibold">
                      {formatQty(r.qty_issued)}
                    </Td>
                    <Td className="tabular text-right">{formatQty(r.avg_per_week)}</Td>
                    <Td className="tabular text-right">{formatQty(r.avg_per_month)}</Td>
                    <Td className="text-right">
                      {cover === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={critical ? "out" : highlightCover ? "low" : "secondary"}>
                          {formatQty(cover)} d
                        </Badge>
                      )}
                    </Td>
                    <Td className="tabular text-right">{formatMoney(r.issued_value)}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {relativeDays(r.last_issued_at)}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-wide", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-top", className)}>{children}</td>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
  );
}
