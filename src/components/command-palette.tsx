"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Package, Search } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn, formatQty } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/app-nav";

type ItemHit = {
  id: string;
  sku: string;
  description: string;
  uom: string;
  total_on_hand: number;
};

type Row =
  | { kind: "nav"; href: string; label: string }
  | { kind: "item"; item: ItemHit };

/**
 * Ctrl/Cmd-K palette. Exists so a desktop user never has to reach for the
 * mouse: type part of a stock code or description, arrow to it, Enter.
 * Nav destinations are listed too so the whole app is keyboard reachable.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setItems([]);
      setCursor(0);
    }
  }

  // The debounce timer owns every state update here, so nothing is set
  // synchronously while the effect is running.
  useEffect(() => {
    const term = query.trim();
    let cancelled = false;

    const t = setTimeout(async () => {
      if (term.length < 2) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("search_stock_items", {
        p_query: term,
        p_limit: 8,
      });
      if (!cancelled) {
        setItems((data as ItemHit[]) ?? []);
        setLoading(false);
        setCursor(0);
      }
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const navMatches = NAV_ITEMS.filter((n) =>
    n.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const rows: Row[] = [
    ...navMatches.map((n) => ({ kind: "nav" as const, href: n.href, label: n.label })),
    ...items.map((item) => ({ kind: "item" as const, item })),
  ];

  const go = useCallback(
    (row: Row) => {
      setOpen(false);
      router.push(row.kind === "nav" ? row.href : `/stock/${row.item.id}`);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && rows[cursor]) {
      e.preventDefault();
      go(rows[cursor]);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="flex items-center gap-3 border-b px-4">
          {loading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-5 text-muted-foreground" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search stock or jump to a screen…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="kbd">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[55dvh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query.trim().length < 2
                ? "Type at least two characters."
                : "Nothing matched that."}
            </p>
          ) : (
            rows.map((row, i) => (
              <button
                key={row.kind === "nav" ? row.href : row.item.id}
                type="button"
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(row)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                  i === cursor ? "bg-accent" : "",
                )}
              >
                {row.kind === "nav" ? (
                  <>
                    <CornerDownLeft className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Screen</span>
                  </>
                ) : (
                  <>
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {row.item.sku}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.item.description}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-semibold">
                      {formatQty(row.item.total_on_hand)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {row.item.uom}
                      </span>
                    </span>
                  </>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
