"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Package, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ScanButton } from "@/components/barcode-scanner";
import { QtyWithUom } from "@/components/shared";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import type { Site } from "@/lib/session";

type Hit = {
  id: string;
  sku: string;
  description: string;
  uom: string;
  barcode: string | null;
  category_name: string | null;
  avg_cost: number;
  reorder_point: number;
  total_on_hand: number;
};

export function StockSearch({
  sites,
  siteId,
}: {
  sites: Site[];
  siteId: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const siteLabel = sites.find((s) => s.id === siteId)?.code;

  const run = useCallback(async (term: string) => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase.rpc("search_stock_items", {
      p_query: term,
      p_limit: 40,
    });
    const rows = (data as Hit[]) ?? [];
    setHits(rows);
    setLoading(false);
    setSearched(true);

    // A barcode read that matches exactly one item should land on that item,
    // not on a list of one. That is the whole point of scanning.
    if (rows.length === 1 && rows[0].barcode === term.trim()) {
      router.push(`/stock/${rows[0].id}`);
    }
  }, [router]);

  // One debounced effect covers both the initial load - an empty term lists
  // the catalogue, so the screen is useful the instant it opens - and every
  // keystroke after it. Running through the timer keeps all state updates
  // out of the synchronous effect body.
  useEffect(() => {
    const term = query.trim();
    const t = setTimeout(() => void run(term), term === "" ? 0 : 160);
    return () => clearTimeout(t);
  }, [query, run]);

  const onScan = useCallback(
    (code: string) => {
      setQuery(code);
      void run(code);
    },
    [run],
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-[3.75rem] z-20 -mx-3 bg-background px-3 py-2 sm:-mx-5 sm:px-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
            <Input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Stock code, description or barcode…"
              className="h-14 pl-11 pr-11 text-base"
              // A keyboard-wedge scanner ends its read with Enter.
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void run(query.trim());
                }
              }}
            />
          </div>
          <ScanButton onScan={onScan} label="Scan barcode" />
        </div>
      </div>

      {hits.length === 0 && searched && !loading ? (
        <EmptyState
          icon={<Package />}
          title="No stock matched that"
          description="Try part of the description, or check the code on the bin label."
        />
      ) : null}

      <div className="grid gap-2">
        {hits.map((hit) => {
          const low = Number(hit.total_on_hand) <= Number(hit.reorder_point);
          const out = Number(hit.total_on_hand) <= 0;
          return (
            <Link key={hit.id} href={`/stock/${hit.id}`}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:border-primary/50 hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{hit.sku}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {hit.description}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {hit.category_name ?? "Uncategorised"} · {formatMoney(hit.avg_cost)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <QtyWithUom
                    qty={hit.total_on_hand}
                    uom={hit.uom}
                    className={
                      out ? "text-lg text-out" : low ? "text-lg text-low" : "text-lg"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {siteLabel ? `at ${siteLabel}` : "all sites"}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
