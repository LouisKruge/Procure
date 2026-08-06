"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import { formatQty } from "@/lib/utils";

export type PickedItem = {
  id: string;
  sku: string;
  description: string;
  uom: string;
  barcode: string | null;
  avg_cost: number;
  total_on_hand: number;
};

/**
 * Shared item finder used by dispatch, transfers and ad-hoc receiving.
 * Scanning a barcode that resolves to exactly one item picks it outright,
 * so a scan-heavy workflow never needs a tap to confirm.
 */
export function ItemPicker({
  onPick,
  placeholder = "Scan or search for an item…",
  autoFocus,
}: {
  onPick: (item: PickedItem) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PickedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (term: string, { autoPick = false } = {}) => {
      if (term.trim().length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("search_stock_items", {
        p_query: term.trim(),
        p_limit: 12,
      });
      const rows = (data as PickedItem[]) ?? [];
      setLoading(false);

      if (autoPick && rows.length === 1) {
        onPick(rows[0]);
        setQuery("");
        setHits([]);
        return;
      }
      setHits(rows);
    },
    [onPick],
  );

  useEffect(() => {
    const t = setTimeout(() => void search(query), 160);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
          <Input
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search(query, { autoPick: true });
              }
            }}
            placeholder={placeholder}
            className="pl-11 pr-11"
          />
        </div>
        <ScanButton
          onScan={(code) => {
            setQuery(code);
            void search(code, { autoPick: true });
          }}
        />
      </div>

      {hits.length > 0 ? (
        <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              onClick={() => {
                onPick(hit);
                setQuery("");
                setHits([]);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{hit.sku}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {hit.description}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold">
                {formatQty(hit.total_on_hand)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {hit.uom}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
