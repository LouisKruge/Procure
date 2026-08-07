"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Loader2, Package, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn, formatMoney, formatQty } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/shell/sidebar";

type ItemHit = {
  id: string;
  sku: string;
  description: string;
  uom: string;
  avg_cost: number;
  total_on_hand: number;
};

type Row =
  | { kind: "nav"; href: string; label: string; group: string; icon: React.ComponentType<{ className?: string }> }
  | { kind: "item"; item: ItemHit };

/**
 * Command palette. Opens on ⌘K or from the sidebar, and is the fastest path
 * to anything in the system: type part of a stock code, a description or a
 * screen name, arrow to it, Enter.
 *
 * Controlled rather than self-managing its own hotkey, so the shell owns all
 * keyboard state in one place.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<ItemHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const reset = React.useCallback(() => {
    setQuery("");
    setItems([]);
    setCursor(0);
  }, []);

  const close = React.useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) reset();
        onOpenChange(!open);
        return;
      }
      if (e.key === "Escape" && open) {
        reset();
        onOpenChange(false);
      }

      // "/" focuses search from anywhere, the way it does in a terminal.
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, reset]);

  React.useEffect(() => {
    const term = query.trim();
    let cancelled = false;

    const t = setTimeout(async () => {
      if (term.length < 2) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await createClient().rpc("search_stock_items", {
        p_query: term,
        p_limit: 8,
      });
      if (!cancelled) {
        setItems((data as ItemHit[]) ?? []);
        setLoading(false);
        setCursor(0);
      }
    }, 130);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const term = query.trim().toLowerCase();
  const navMatches = NAV_ITEMS.filter(
    (n) => term === "" || n.label.toLowerCase().includes(term) || n.group.toLowerCase().includes(term),
  ).slice(0, term === "" ? 6 : 5);

  const rows: Row[] = [
    ...navMatches.map((n) => ({
      kind: "nav" as const,
      href: n.href,
      label: n.label,
      group: n.group,
      icon: n.icon,
    })),
    ...items.map((item) => ({ kind: "item" as const, item })),
  ];

  const go = React.useCallback(
    (row: Row) => {
      close();
      router.push(row.kind === "nav" ? row.href : `/stock/${row.item.id}`);
    },
    [router, close],
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

  React.useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--layer-overlay)] p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-label="Search"
        className="animate-in-up w-full max-w-[620px] overflow-hidden rounded-[var(--r-xl)] bg-[var(--layer-modal)] shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--line-subtle)] px-4">
          {loading ? (
            <Loader2 className="size-[18px] animate-spin text-[var(--nav-bright)]" />
          ) : (
            <Search className="size-[18px] text-[var(--text-quaternary)]" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search stock, or jump to a screen…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-quaternary)]"
          />
          <kbd className="kbd">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52dvh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-[var(--text-quaternary)]">
              {query.trim().length < 2
                ? "Type at least two characters"
                : `Nothing matched “${query.trim()}”`}
            </p>
          ) : (
            <>
              {navMatches.length > 0 ? (
                <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-quaternary)]">
                  Go to
                </p>
              ) : null}

              {rows.map((row, i) => {
                const active = i === cursor;
                const isFirstItem =
                  row.kind === "item" && rows.findIndex((r) => r.kind === "item") === i;

                return (
                  <React.Fragment key={row.kind === "nav" ? row.href : row.item.id}>
                    {isFirstItem ? (
                      <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-quaternary)]">
                        Stock
                      </p>
                    ) : null}

                    <button
                      type="button"
                      data-active={active}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(row)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left transition-colors",
                        active ? "bg-[var(--layer-interactive)]" : "",
                      )}
                    >
                      {row.kind === "nav" ? (
                        <>
                          <span className="grid size-7 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--layer-interactive)]">
                            <row.icon className="size-3.5 text-[var(--text-secondary)]" />
                          </span>
                          <span className="flex-1 text-[13px] font-medium">{row.label}</span>
                          <span className="text-[11px] text-[var(--text-quaternary)]">
                            {row.group}
                          </span>
                          {active ? (
                            <CornerDownLeft className="size-3.5 text-[var(--text-quaternary)]" />
                          ) : (
                            <ArrowRight className="size-3.5 text-[var(--text-disabled)]" />
                          )}
                        </>
                      ) : (
                        <>
                          <span className="grid size-7 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--layer-interactive)]">
                            <Package className="size-3.5 text-[var(--text-secondary)]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="code block truncate text-[13px] font-semibold">
                              {row.item.sku}
                            </span>
                            <span className="block truncate text-[11px] text-[var(--text-quaternary)]">
                              {row.item.description}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="num block text-[13px] font-semibold">
                              {formatQty(row.item.total_on_hand)}
                              <span className="ml-1 text-[10px] font-normal text-[var(--text-quaternary)]">
                                {row.item.uom}
                              </span>
                            </span>
                            <span className="num block text-[10.5px] text-[var(--text-quaternary)]">
                              {formatMoney(row.item.avg_cost)}
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-[var(--line-subtle)] px-4 py-2 text-[10.5px] text-[var(--text-quaternary)]">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="kbd">C</kbd> create
          </span>
        </div>
      </div>
    </div>
  );
}
