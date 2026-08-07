"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, QtyInput } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanButton } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { cn, formatMoney, formatQty } from "@/lib/utils";
import type { Site } from "@/lib/session";

/* ==========================================================================
 * The stock counter.
 *
 * One screen for the movement that happens all day: someone names a part or
 * reads a bin off the shelf, says how many, and it goes out - or comes back.
 * Everything else (job references, dispatch notes, purchase orders) lives on
 * the dispatch and receiving screens; this one is deliberately three fields.
 *
 * The whole thing is keyboard-first. Search, Enter to pick, type a quantity,
 * Enter to issue. A hardware scanner types into the search box like a
 * keyboard and lands on the item outright when the barcode is unique.
 * ========================================================================== */

type Hit = {
  item_id: string;
  sku: string;
  description: string;
  uom: string;
  barcode: string | null;
  bin_location: string | null;
  location: string | null;
  category_name: string | null;
  qty_on_hand: number;
  reorder_point: number;
  avg_cost: number;
  stock_status: string;
};

type Posted = {
  id: string;
  itemId: string;
  sku: string;
  description: string;
  uom: string;
  qty: number;
  direction: "in" | "out";
  qtyAfter: number;
  at: Date;
  undone: boolean;
};

export function Counter({
  sites,
  siteId,
}: {
  sites: Site[];
  siteId: string | null;
}) {
  const [site, setSite] = React.useState(siteId ?? sites[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [picked, setPicked] = React.useState<Hit | null>(null);
  const [qty, setQty] = React.useState("1");
  const [reason, setReason] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [busy, setBusy] = React.useState<"in" | "out" | null>(null);
  const [log, setLog] = React.useState<Posted[]>([]);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);

  const pick = React.useCallback((hit: Hit) => {
    setPicked(hit);
    setHits([]);
    setQuery("");
    setQty("1");
    // Let the quantity field mount before reaching for it.
    setTimeout(() => qtyRef.current?.select(), 0);
  }, []);

  const search = React.useCallback(
    async (term: string, { autoPick = false } = {}) => {
      const t = term.trim();
      if (!site || t.length < 2) {
        setHits([]);
        return;
      }

      setSearching(true);
      const { data, error } = await createClient().rpc("counter_search", {
        p_site_id: site,
        p_query: t,
        p_limit: 12,
      });
      setSearching(false);

      if (error) {
        toast.error(friendlyError(error));
        return;
      }

      const rows = (data ?? []) as Hit[];

      // A scan or an exact bin that resolves to one row should not need a
      // confirming tap - the person is holding the part already.
      if (autoPick && rows.length === 1) {
        pick(rows[0]);
        return;
      }
      setHits(rows);
    },
    [site, pick],
  );

  React.useEffect(() => {
    const t = setTimeout(() => void search(query), 160);
    return () => clearTimeout(t);
  }, [query, search]);

  function clearItem() {
    setPicked(null);
    setQty("1");
    setReason("");
    setReference("");
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  async function post(direction: "in" | "out") {
    if (!picked || !site) return;

    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a quantity greater than zero.");
      qtyRef.current?.select();
      return;
    }

    setBusy(direction);
    const { data, error } = await createClient().rpc("counter_post", {
      p_item_id: picked.item_id,
      p_site_id: site,
      p_direction: direction,
      p_qty: amount,
      p_reason: reason || null,
      p_reference: reference || null,
    });
    setBusy(null);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }

    const movement = data as { id: string; qty_after: number | null };
    const after = Number(movement?.qty_after ?? 0);

    setLog((l) => [
      {
        id: movement.id,
        itemId: picked.item_id,
        sku: picked.sku,
        description: picked.description,
        uom: picked.uom,
        qty: amount,
        direction,
        qtyAfter: after,
        at: new Date(),
        undone: false,
      },
      ...l,
    ]);

    toast.success(
      direction === "out"
        ? `${formatQty(amount)} ${picked.uom} of ${picked.sku} issued — ${formatQty(after)} left.`
        : `${formatQty(amount)} ${picked.uom} of ${picked.sku} received — ${formatQty(after)} on hand.`,
    );

    clearItem();
  }

  /**
   * Undo posts the opposite movement rather than deleting anything. The
   * original line stays in the audit trail, which is the whole point of
   * having one.
   */
  async function undo(entry: Posted) {
    const opposite = entry.direction === "out" ? "in" : "out";

    const { error } = await createClient().rpc("counter_post", {
      p_item_id: entry.itemId,
      p_site_id: site,
      p_direction: opposite,
      p_qty: entry.qty,
      p_reason: `Reversal of counter movement ${entry.id.slice(0, 8)}`,
      p_reference: null,
    });

    if (error) {
      toast.error(friendlyError(error));
      return;
    }

    setLog((l) => l.map((e) => (e.id === entry.id ? { ...e, undone: true } : e)));
    toast.success(
      entry.direction === "out"
        ? `${entry.sku} put back on the shelf.`
        : `${entry.sku} taken off again.`,
    );
  }

  const preview = picked
    ? picked.qty_on_hand - (Number(qty) || 0)
    : 0;
  const wouldGoNegative = picked ? preview < 0 : false;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        {/* Site -------------------------------------------------------- */}
        {sites.length > 1 ? (
          <Card className="p-4">
            <div className="max-w-sm space-y-1.5">
              <Label>Working at</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ) : null}

        {/* Find -------------------------------------------------------- */}
        {picked ? null : (
          <Card className="p-4">
            <Label htmlFor="counter-search">Find the part</Label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                {searching ? (
                  <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
                <Input
                  id="counter-search"
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void search(query, { autoPick: true });
                    }
                  }}
                  placeholder="Code, description or bin — e.g. AA-06, hex bolt, CON-AA-06"
                  className="h-14 pl-11 pr-11 text-[16px]"
                />
              </div>
              <ScanButton onScan={(code) => void search(code, { autoPick: true })} />
            </div>

            {hits.length ? (
              <ul className="mt-3 divide-y divide-[var(--line-subtle)] overflow-hidden rounded-lg border border-[var(--line)]">
                {hits.map((h) => (
                  <li key={h.item_id}>
                    <button
                      type="button"
                      onClick={() => pick(h)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--layer-interactive)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="code text-[13px] font-semibold">{h.sku}</span>
                          {h.bin_location ? (
                            <span className="code rounded bg-[var(--layer-sunken)] px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              bin {h.bin_location}
                              {h.location ? ` · ${h.location}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {h.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "num text-base font-semibold",
                            h.stock_status === "out"
                              ? "text-out"
                              : h.stock_status === "low"
                                ? "text-low"
                                : "text-foreground",
                          )}
                        >
                          {formatQty(h.qty_on_hand)}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">{h.uom}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 && !searching ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing matches “{query.trim()}”. Try the bin number or part of
                the description.
              </p>
            ) : null}
          </Card>
        )}

        {/* Book -------------------------------------------------------- */}
        {picked ? (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="code text-[15px] font-bold">{picked.sku}</span>
                  {picked.bin_location ? (
                    <Badge variant="outline">
                      bin {picked.bin_location}
                      {picked.location ? ` · ${picked.location}` : ""}
                    </Badge>
                  ) : null}
                  {picked.stock_status === "out" ? (
                    <Badge variant="out">Out of stock</Badge>
                  ) : picked.stock_status === "low" ? (
                    <Badge variant="low">Below minimum</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {picked.description}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearItem} aria-label="Clear">
                <X />
              </Button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="counter-qty">Quantity ({picked.uom})</Label>
                <QtyInput
                  id="counter-qty"
                  ref={qtyRef}
                  value={qty}
                  min={0}
                  step="any"
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void post("out");
                    }
                    if (e.key === "Escape") clearItem();
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="counter-ref">Job or reference (optional)</Label>
                  <Input
                    id="counter-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="JOB-4471"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="counter-reason">Who or why (optional)</Label>
                  <Input
                    id="counter-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Workshop — Pieter"
                  />
                </div>
              </div>
            </div>

            {/* What the shelf will read afterwards. Shown before the button
                is pressed, because that is when it is useful. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-[var(--layer-sunken)] px-4 py-3">
              <Figure label="On hand now" value={`${formatQty(picked.qty_on_hand)} ${picked.uom}`} />
              <Figure
                label="After issuing"
                value={`${formatQty(preview)} ${picked.uom}`}
                tone={wouldGoNegative ? "out" : preview <= picked.reorder_point ? "low" : undefined}
              />
              <Figure
                label="Value of this line"
                value={formatMoney((Number(qty) || 0) * Number(picked.avg_cost))}
              />
            </div>

            {wouldGoNegative ? (
              <p className="mt-3 rounded-lg bg-out-subtle px-3 py-2 text-sm font-medium text-out">
                Only {formatQty(picked.qty_on_hand)} {picked.uom} on hand here.
                Issuing {formatQty(Number(qty) || 0)} would take it negative —
                count the shelf or transfer from another site first.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 sm:flex-none sm:px-10"
                disabled={busy !== null}
                onClick={() => void post("out")}
              >
                {busy === "out" ? <Loader2 className="animate-spin" /> : <ArrowUpFromLine />}
                Issue out
              </Button>
              <Button
                size="lg"
                variant="ok"
                className="flex-1 sm:flex-none sm:px-10"
                disabled={busy !== null}
                onClick={() => void post("in")}
              >
                {busy === "in" ? <Loader2 className="animate-spin" /> : <ArrowDownToLine />}
                Receive in
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Enter issues out. Esc clears the item.
            </p>
          </Card>
        ) : null}
      </div>

      {/* Session log --------------------------------------------------- */}
      <Card className="h-fit p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Booked this session</h2>
          {log.length ? (
            <span className="num text-xs text-muted-foreground">{log.length}</span>
          ) : null}
        </div>

        {log.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing yet. Everything you book here shows up in the item history
            and the movement reports straight away.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {log.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "rounded-lg bg-[var(--layer-sunken)] px-3 py-2.5",
                  e.undone && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="code min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {e.sku}
                  </span>
                  <span
                    className={cn(
                      "num text-[13px] font-semibold",
                      e.direction === "out" ? "text-out" : "text-ok",
                    )}
                  >
                    {e.direction === "out" ? "−" : "+"}
                    {formatQty(e.qty)}
                  </span>
                </div>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {e.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="code text-[10.5px] text-muted-foreground">
                    {formatQty(e.qtyAfter)} {e.uom} left
                  </span>
                  {e.undone ? (
                    <span className="ml-auto text-[10.5px] text-muted-foreground">
                      reversed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void undo(e)}
                      className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Undo2 className="size-3" />
                      Put back
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "out" | "low";
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "num mt-0.5 text-lg font-semibold",
          tone === "out" ? "text-out" : tone === "low" ? "text-low" : undefined,
        )}
      >
        {value}
      </p>
    </div>
  );
}
