"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Loader2,
  Package,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Chip, SectionLabel } from "@/components/ui/data-display";
import { ScanButton } from "@/components/barcode-scanner";

/* ==========================================================================
 * Stock catalogue.
 *
 * The screen for "show me everything I have". Search narrows it, but the
 * default state is the whole range, paged and sortable, because most of the
 * time you are browsing a category or a bin run rather than hunting one part.
 *
 * Filtering, sorting and paging all happen in Postgres. With 2,000+ lines,
 * pulling the lot into the browser to sort it would be the wrong trade.
 * ========================================================================== */

type Row = {
  item_id: string;
  level_id: string;
  sku: string;
  description: string;
  uom: string;
  category_name: string | null;
  group_name: string | null;
  bin_location: string | null;
  location: string | null;
  qty_on_hand: number;
  qty_on_order: number;
  reorder_point: number;
  avg_cost: number;
  stock_value: number;
  stock_status: string;
  last_movement_at: string | null;
};

type Category = { id: string; name: string; parent_id: string | null };

type Sort = {
  column: "sku" | "description" | "qty_on_hand" | "stock_value" | "bin_location" | "last_movement_at";
  asc: boolean;
};

const PAGE_SIZE = 50;
const ALL = "__all__";

const STATUS_FILTERS = [
  { value: ALL, label: "All stock" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Below minimum" },
  { value: "ok", label: "In stock" },
] as const;

export function StockCatalogue({
  categories,
  locations,
  siteId,
}: {
  categories: Category[];
  locations: string[];
  siteId: string | null;
}) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [location, setLocation] = React.useState(ALL);
  const [status, setStatus] = React.useState<string>(ALL);
  const [sort, setSort] = React.useState<Sort>({ column: "sku", asc: true });
  const [page, setPage] = React.useState(0);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let q = supabase
      .from("v_stock_status")
      .select(
        "item_id, level_id, sku, description, uom, category_name, group_name, bin_location, location, qty_on_hand, qty_on_order, reorder_point, avg_cost, stock_value, stock_status, last_movement_at",
        { count: "exact" },
      );

    if (siteId) q = q.eq("site_id", siteId);
    if (category !== ALL) q = q.eq("category_id", category);
    if (location !== ALL) q = q.eq("location", location);
    if (status !== ALL) q = q.eq("stock_status", status);

    const term = search.trim();
    if (term) {
      const like = `%${term}%`;
      q = q.or(
        `sku.ilike.${like},description.ilike.${like},bin_location.ilike.${like}`,
      );
    }

    q = q
      .order(sort.column, { ascending: sort.asc, nullsFirst: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, error, count } = await q;
    setLoading(false);

    if (error) return toast.error(friendlyError(error));
    setRows((data as unknown as Row[]) ?? []);
    setTotal(count ?? 0);
  }, [search, category, location, status, sort, page, siteId]);

  React.useEffect(() => {
    const t = setTimeout(() => void load(), 180);
    return () => clearTimeout(t);
  }, [load]);

  /**
   * Any filter change resets to page one, or you end up staring at an empty
   * page 7 of a 3-page result. Done in the change handlers rather than an
   * effect so it happens in the same render as the filter itself.
   */
  function resetTo<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  const setSearchAndReset = resetTo(setSearch);
  const setCategoryAndReset = resetTo(setCategory);
  const setLocationAndReset = resetTo(setLocation);
  const setStatusAndReset = resetTo(setStatus);

  function toggleSort(column: Sort["column"]) {
    setSort((s) => (s.column === column ? { column, asc: !s.asc } : { column, asc: true }));
    setPage(0);
  }

  async function exportAll() {
    const supabase = createClient();
    let q = supabase.from("v_stock_status").select("*").limit(5000);
    if (siteId) q = q.eq("site_id", siteId);
    if (category !== ALL) q = q.eq("category_id", category);
    if (location !== ALL) q = q.eq("location", location);
    if (status !== ALL) q = q.eq("stock_status", status);

    const { data, error } = await q;
    if (error) return toast.error(friendlyError(error));
    if (!data?.length) return toast.info("Nothing to export.");

    downloadCsv(
      `stock-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(data as unknown as Record<string, unknown>[]),
    );
    toast.success(`Exported ${data.length} lines.`);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = category !== ALL || location !== ALL || status !== ALL || search.trim() !== "";

  return (
    <div className="space-y-3">
      {/* Controls ----------------------------------------------------- */}
      <div className="surface flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-quaternary)]" />
          <input
            value={search}
            onChange={(e) => setSearchAndReset(e.target.value)}
            placeholder="Filter by code, description or bin…"
            className="h-9 w-full rounded-[var(--r-md)] bg-[var(--layer-sunken)] pl-9 pr-8 text-[13px] outline-none placeholder:text-[var(--text-quaternary)] focus-visible:ring-1 focus-visible:ring-[var(--nav)]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearchAndReset("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
              aria-label="Clear filter"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <Picker value={category} onChange={setCategoryAndReset} label="Category">
          <option value={ALL}>All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? "— " : ""}
              {c.name}
            </option>
          ))}
        </Picker>

        {locations.length > 0 ? (
          <Picker value={location} onChange={setLocationAndReset} label="Location">
            <option value={ALL}>All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Picker>
        ) : null}

        <div className="flex items-center gap-1 rounded-[var(--r-md)] bg-[var(--layer-sunken)] p-0.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusAndReset(s.value)}
              className={cn(
                "rounded-[var(--r-sm)] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                status === s.value
                  ? "bg-[var(--layer-interactive)] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <ScanButton onScan={(code) => setSearchAndReset(code)} label="Scan" />

        <button
          type="button"
          onClick={exportAll}
          className="flex h-9 items-center gap-1.5 rounded-[var(--r-md)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--layer-interactive)]"
        >
          <Download className="size-3.5" /> Export
        </button>
      </div>

      {/* Table -------------------------------------------------------- */}
      <div className="surface overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <SectionLabel>
            {loading ? "Loading…" : `${formatQty(total)} line${total === 1 ? "" : "s"}`}
          </SectionLabel>
          {filtered && !loading ? <Chip tone="nav">filtered</Chip> : null}
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-[var(--text-quaternary)]" />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-[13px]">
            <thead>
              <tr className="bg-[var(--layer-sunken)] text-left">
                <Th sort={sort} column="sku" onSort={toggleSort}>Code</Th>
                <Th sort={sort} column="description" onSort={toggleSort}>Description</Th>
                <Th>Category</Th>
                <Th sort={sort} column="bin_location" onSort={toggleSort}>Bin</Th>
                <Th>Loc</Th>
                <Th sort={sort} column="qty_on_hand" onSort={toggleSort} align="right">On hand</Th>
                <Th align="right">Min</Th>
                <Th align="right">Cost</Th>
                <Th sort={sort} column="stock_value" onSort={toggleSort} align="right">Value</Th>
                <Th sort={sort} column="last_movement_at" onSort={toggleSort}>Last moved</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10}>
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <Package className="size-7 text-[var(--text-disabled)]" />
                      <p className="text-[13px] font-medium">
                        {total === 0 && !filtered
                          ? "No stock loaded yet"
                          : "Nothing matched those filters"}
                      </p>
                      <p className="max-w-sm text-[12px] text-[var(--text-quaternary)]">
                        {total === 0 && !filtered ? (
                          <>
                            Load your spreadsheet from{" "}
                            <Link href="/import" className="text-[var(--nav-bright)] hover:underline">
                              Import stock
                            </Link>
                            .
                          </>
                        ) : (
                          "Try clearing the filters or widening the search."
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const out = r.stock_status === "out";
                  const low = r.stock_status === "low";
                  return (
                    <tr
                      key={r.level_id}
                      className="border-t border-[var(--line-subtle)] transition-colors hover:bg-[var(--layer-interactive)]"
                    >
                      <Td>
                        <Link
                          href={`/stock/${r.item_id}`}
                          className="code font-semibold hover:text-[var(--nav-bright)]"
                        >
                          {r.sku}
                        </Link>
                      </Td>
                      <Td className="max-w-[22rem]">
                        <span className="block truncate text-[var(--text-secondary)]">
                          {r.description}
                        </span>
                      </Td>
                      <Td className="text-[var(--text-tertiary)]">
                        {r.category_name ?? "—"}
                      </Td>
                      <Td className="code text-[var(--text-tertiary)]">
                        {r.bin_location ?? "—"}
                      </Td>
                      <Td className="code text-[var(--text-quaternary)]">
                        {r.location ?? "—"}
                      </Td>
                      <Td align="right">
                        <span
                          className={cn(
                            "num font-semibold",
                            out && "text-[var(--critical-bright)]",
                            low && "text-[var(--attention-bright)]",
                          )}
                        >
                          {formatQty(r.qty_on_hand)}
                        </span>
                        <span className="ml-1 text-[10px] text-[var(--text-quaternary)]">
                          {r.uom}
                        </span>
                        {Number(r.qty_on_order) > 0 ? (
                          <span className="num ml-1.5 text-[10px] text-[var(--auto-bright)]">
                            +{formatQty(r.qty_on_order)}
                          </span>
                        ) : null}
                      </Td>
                      <Td align="right" className="num text-[var(--text-quaternary)]">
                        {formatQty(r.reorder_point)}
                      </Td>
                      <Td align="right" className="num text-[var(--text-tertiary)]">
                        {formatMoney(r.avg_cost)}
                      </Td>
                      <Td align="right" className="num">
                        {formatMoney(r.stock_value)}
                      </Td>
                      <Td className="whitespace-nowrap text-[12px] text-[var(--text-quaternary)]">
                        {relativeDays(r.last_movement_at)}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paging --------------------------------------------------- */}
        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line-subtle)] px-4 py-2.5">
            <p className="num text-[12px] text-[var(--text-quaternary)]">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
              {formatQty(total)}
            </p>
            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="size-4" />
              </PageBtn>
              <span className="num px-2 text-[12px] text-[var(--text-tertiary)]">
                {page + 1} / {pages}
              </span>
              <PageBtn
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
              >
                <ChevronRight className="size-4" />
              </PageBtn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- bits */

function Picker({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-[var(--r-md)] bg-[var(--layer-sunken)] px-2.5 text-[12px] text-[var(--text-secondary)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--nav)]"
    >
      {children}
    </select>
  );
}

function Th({
  children,
  align,
  sort,
  column,
  onSort,
}: {
  children?: React.ReactNode;
  align?: "right";
  sort?: Sort;
  column?: Sort["column"];
  onSort?: (c: Sort["column"]) => void;
}) {
  const sortable = Boolean(column && onSort);
  const active = sort && column && sort.column === column;

  return (
    <th
      className={cn(
        "px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--text-quaternary)]",
        align === "right" && "text-right",
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(column!)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]",
            active && "text-[var(--text-primary)]",
          )}
        >
          {children}
          {active ? (
            sort!.asc ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )
          ) : null}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Td({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "right";
}) {
  return (
    <td className={cn("px-3 py-2", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--layer-interactive)] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
