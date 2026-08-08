"use client";

import * as React from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Factory,
  Hammer,
  Leaf,
  Mountain,
  PackagePlus,
  ScanLine,
  ShoppingCart,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";

import { cn, formatMoney, formatQty } from "@/lib/utils";
import { Chip, Meter } from "@/components/ui/data-display";

import { CountUp, Cta, Reveal, SectionHead } from "./primitives";

/* ==========================================================================
 * Page sections.
 *
 * Each one is a reveal rather than a slab of copy: a claim, then the piece
 * of interface that backs it up. Nothing here is a screenshot - the visuals
 * are the real components, so they cannot drift out of date.
 * ========================================================================== */

/* ---------------------------------------------------------- 01 showcase */

const MODULES = [
  {
    id: "inventory",
    label: "Inventory",
    note: "Quantities, bins, minimums",
    icon: Boxes,
    headline: "Per site. Not one number.",
    body: "Every quantity is held per item per location. The moment you ask “where is it”, the system already knows.",
  },
  {
    id: "procurement",
    label: "Procurement",
    note: "Shortfalls, suppliers, orders",
    icon: ShoppingCart,
    headline: "From shortfall to order.",
    body: "Everything below its minimum, grouped by supplier, with quantities already worked out. One action turns a selection into draft purchase orders.",
  },
  {
    id: "receiving",
    label: "Receiving",
    note: "Book in, part-deliver, cost",
    icon: PackagePlus,
    headline: "Scan. Count. Posted.",
    body: "Book in against a purchase order or ad-hoc. Partial deliveries are the norm, so they are the default. Weighted average cost updates on the way through.",
  },
  {
    id: "counts",
    label: "Stock takes",
    note: "Snapshot, variance, approval",
    icon: ClipboardCheck,
    headline: "Nothing corrects itself quietly.",
    body: "Expected quantities are snapshotted when counting starts. Variances wait for a supervisor, then post as logged adjustments.",
  },
] as const;

export function Showcase() {
  const [active, setActive] = React.useState<(typeof MODULES)[number]["id"]>("inventory");
  const current = MODULES.find((m) => m.id === active)!;

  return (
    <section id="platform" className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        <SectionHead
          index="01"
          eyebrow="One platform"
          title={
            <>
              Every part of the stockroom,
              <br />
              in one place.
            </>
          }
          lede="Disconnected spreadsheets and a twenty-year-old ERP screen are two ways of not knowing what you have. Nexus keeps the whole operation in one model."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-14">
          {/* Selector */}
          <Reveal>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {MODULES.map((m) => {
                const Icon = m.icon;
                const on = m.id === active;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onMouseEnter={() => setActive(m.id)}
                    onFocus={() => setActive(m.id)}
                    onClick={() => setActive(m.id)}
                    aria-pressed={on}
                    className={cn(
                      "group relative flex shrink-0 items-center gap-3 rounded-[var(--r-lg)] px-4 py-3.5 text-left transition-all duration-300 lg:w-full",
                      on
                        ? "bg-[var(--layer-surface)] shadow-[var(--shadow-md)]"
                        : "hover:bg-[oklch(1_0_0_/_0.03)]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-3 left-0 w-0.5 rounded-full bg-white transition-all duration-300",
                        on ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-[var(--r-md)] transition-colors",
                        on ? "bg-[oklch(1_0_0_/_0.10)]" : "bg-[oklch(1_0_0_/_0.04)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          on ? "text-white" : "text-[var(--text-tertiary)]",
                        )}
                      />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block whitespace-nowrap text-[14px] font-medium transition-colors",
                          on ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]",
                        )}
                      >
                        {m.label}
                      </span>
                      <span className="mt-0.5 hidden whitespace-nowrap text-[11.5px] text-[var(--text-quaternary)] lg:block">
                        {m.note}
                      </span>
                    </span>
                    <ArrowRight
                      className={cn(
                        "ml-auto hidden size-3.5 shrink-0 transition-all duration-300 lg:block",
                        on
                          ? "translate-x-0 text-white opacity-100"
                          : "-translate-x-1 opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {/* The rest of the platform, stated rather than staged - four
                tabs is the most anyone will actually click through. */}
            <div className="mt-8 hidden border-t border-[var(--line-subtle)] pt-6 lg:block">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-quaternary)]">
                Also included
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  ["Dispatch", "Issue to job, cost centre or customer"],
                  ["Transfers", "Site to site, with an in-transit state"],
                  ["Costing", "Weighted average, recalculated on receipt"],
                  ["Bin labels", "Scannable barcodes, print-ready A4"],
                ].map(([h, d]) => (
                  <li key={h}>
                    <span className="block text-[12.5px] font-medium text-[var(--text-secondary)]">
                      {h}
                    </span>
                    <span className="block text-[11.5px] text-[var(--text-quaternary)]">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Stage */}
          <Reveal delay={80}>
            <div className="relative">
              <div className="min-h-[7rem]">
                <h3
                  key={`${current.id}-h`}
                  className="animate-in-up mk-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)]"
                >
                  {current.headline}
                </h3>
                <p key={`${current.id}-b`} className="animate-in-up mk-lede mt-3 max-w-lg">
                  {current.body}
                </p>
              </div>

              <div
                key={current.id}
                className="animate-in-up relative mt-7 overflow-hidden rounded-[var(--r-xl)] bg-[var(--layer-surface)] shadow-[0_30px_80px_-30px_oklch(0_0_0_/_0.9),0_0_0_1px_var(--line)]"
              >
                <div className="surface-sheen pointer-events-none absolute inset-0" />
                <ModuleStage id={current.id} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ModuleStage({ id }: { id: string }) {
  if (id === "procurement") {
    return (
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[12px] font-semibold">Pirtek</p>
          <Chip tone="neutral">4 lines</Chip>
          <span className="num ml-auto text-[12px] font-semibold">{formatMoney(18420)}</span>
        </div>
        {[
          ["FIT-AW-07", "Cap 7/16 JIC Fem SW", 0, 6, 60],
          ["FIT-AU-09", "Plug 9/16 JIC Male", 4, 12, 24],
          ["FIT-AW-12", "Cap 3/4 JIC Fem SW", 9, 10, 20],
        ].map(([code, desc, qty, min, order]) => (
          <div
            key={String(code)}
            className="flex items-center gap-3 border-t border-[var(--line-subtle)] py-2.5"
          >
            <span className="grid size-4 place-items-center rounded-[3px] bg-[var(--brass)] text-[9px] font-bold text-[#0B0A08]">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <span className="code block text-[11.5px] font-semibold">{code}</span>
              <span className="block truncate text-[11px] text-[var(--text-quaternary)]">
                {desc}
              </span>
            </div>
            <span className="num text-[11.5px] text-[var(--critical-bright)]">
              {formatQty(Number(qty))}
            </span>
            <span className="text-[10.5px] text-[var(--text-quaternary)]">
              min {String(min)}
            </span>
            <span className="num w-14 rounded-[var(--r-sm)] bg-[var(--layer-sunken)] py-1 text-center text-[11.5px] font-semibold">
              {String(order)}
            </span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line-subtle)] pt-3">
          <span className="text-[11.5px] text-[var(--text-tertiary)]">3 suppliers selected</span>
          <span className="rounded-[var(--r-md)] bg-[var(--brass)] px-3 py-1.5 text-[11.5px] font-medium text-[#0B0A08]">
            Create purchase orders
          </span>
        </div>
      </div>
    );
  }

  if (id === "receiving") {
    return (
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="code text-[12px] font-semibold">PO-000118</span>
          <Chip tone="attention">Part received</Chip>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--text-quaternary)]">
            <ScanLine className="size-3.5" /> scan to fill
          </span>
        </div>
        {[
          ["CON-AB-14", "M10×50 Hex Bolt", 240, 240],
          ["CON-AB-15", "M12×35 Cap Screw", 120, 60],
          ["CON-AC-22", "M6×45 Cap Screw", 300, 0],
        ].map(([code, desc, ordered, recv], i) => (
          <div
            key={String(code)}
            className={cn(
              "flex items-center gap-3 border-t border-[var(--line-subtle)] py-2.5",
              i === 0 && "bg-[var(--success-wash)]",
            )}
          >
            <div className="min-w-0 flex-1 pl-1">
              <span className="code block text-[11.5px] font-semibold">{code}</span>
              <span className="block truncate text-[11px] text-[var(--text-quaternary)]">
                {desc} · ordered {String(ordered)}
              </span>
            </div>
            <span className="num w-16 rounded-[var(--r-sm)] bg-[var(--layer-sunken)] py-1.5 text-center text-[13px] font-bold">
              {String(recv)}
            </span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line-subtle)] pt-3">
          <div>
            <p className="text-[11px] text-[var(--text-tertiary)]">This receipt</p>
            <p className="num text-[13px] font-semibold">300 units · {formatMoney(1284)}</p>
          </div>
          <span className="rounded-[var(--r-md)] bg-[var(--brass)] px-3 py-1.5 text-[11.5px] font-medium text-[#0B0A08]">
            Post receipt
          </span>
        </div>
      </div>
    );
  }

  if (id === "counts") {
    return (
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="code text-[12px] font-semibold">ST-001042</span>
          <Chip tone="pending" dot>
            Awaiting approval
          </Chip>
          <span className="num ml-auto text-[12px] font-semibold text-[var(--critical-bright)]">
            −{formatMoney(12480)}
          </span>
        </div>
        {[
          ["CON-AA-01", "M8×35 Hex Bolt", 185, 179, -6],
          ["CON-AA-06", "M8×60 Hex Bolt", 735, 735, 0],
          ["CON-AB-31", "M5×16 Hex Bolt", 53, 61, 8],
        ].map(([code, desc, exp, counted, delta]) => (
          <div
            key={String(code)}
            className="flex items-center gap-3 border-t border-[var(--line-subtle)] py-2.5"
          >
            <div className="min-w-0 flex-1">
              <span className="code block text-[11.5px] font-semibold">{code}</span>
              <span className="block truncate text-[11px] text-[var(--text-quaternary)]">
                {desc} · expected {String(exp)}
              </span>
            </div>
            <span className="num w-14 rounded-[var(--r-sm)] bg-[var(--layer-sunken)] py-1 text-center text-[12px] font-semibold">
              {String(counted)}
            </span>
            <span
              className={cn(
                "num w-10 text-right text-[11.5px] font-semibold",
                Number(delta) < 0
                  ? "text-[var(--critical-bright)]"
                  : Number(delta) > 0
                    ? "text-[var(--success-bright)]"
                    : "text-[var(--text-quaternary)]",
              )}
            >
              {Number(delta) > 0 ? "+" : ""}
              {String(delta)}
            </span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line-subtle)] pt-3">
          <span className="text-[11.5px] text-[var(--text-tertiary)]">
            18 of 412 lines out
          </span>
          <span className="rounded-[var(--r-md)] bg-[var(--brass)] px-3 py-1.5 text-[11.5px] font-medium text-[#0B0A08]">
            Approve and post
          </span>
        </div>
      </div>
    );
  }

  // inventory
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="code text-[12px] font-semibold">HH-R2-12</span>
        <span className="text-[11.5px] text-[var(--text-quaternary)]">
          Hydraulic Hose R2 1/2&quot;
        </span>
        <Chip tone="attention" className="ml-auto">
          Below min
        </Chip>
      </div>
      {[
        ["MAIN", "Main Warehouse", "A02-01", 86, "ok"],
        ["JHB", "Johannesburg", "B04-02", 12, "attention"],
        ["DBN", "Durban", "C01-06", 0, "critical"],
        ["CPT", "Cape Town", "D02-01", 41, "ok"],
      ].map(([code, name, bin, qty, tone]) => (
        <div
          key={String(code)}
          className="flex items-center gap-3 border-t border-[var(--line-subtle)] py-2.5"
        >
          <span className="code w-12 text-[11.5px] font-semibold">{code}</span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[11.5px] text-[var(--text-secondary)]">
              {name}
            </span>
            <span className="code block text-[10.5px] text-[var(--text-quaternary)]">
              bin {bin}
            </span>
          </div>
          <span
            className={cn(
              "num text-[13px] font-semibold",
              tone === "critical"
                ? "text-[var(--critical-bright)]"
                : tone === "attention"
                  ? "text-[var(--attention-bright)]"
                  : "text-[var(--text-primary)]",
            )}
          >
            {formatQty(Number(qty))}
            <span className="ml-1 text-[10px] font-normal text-[var(--text-quaternary)]">M</span>
          </span>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--line-subtle)] pt-3 text-[11.5px]">
        <span className="text-[var(--text-tertiary)]">Total on hand</span>
        <span className="num font-semibold">139 M · {formatMoney(11981.8)}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 02 features */

export function Features() {
  return (
    <section className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        <SectionHead
          index="02"
          eyebrow="Intelligence"
          title={
            <>
              It knows what runs out
              <br />
              before you do.
            </>
          }
          lede="Usage is measured from real movements, not guessed. Every issue and receipt sharpens the picture of what moves, what sits, and how long the shelf lasts."
        />

        <div className="mt-16 space-y-6">
          <FeatureRow
            title="Days of cover, in plain language"
            body="Consumption rate against what is on the shelf. Not a chart to interpret — a sentence: this runs out in four days."
            visual={<CoverVisual />}
          />
          <FeatureRow
            title="Dead stock, found automatically"
            body="Lines holding value that have not moved. The capital sitting in a bin doing nothing, ranked by what it is worth."
            visual={<DeadVisual />}
            reverse
          />
          <FeatureRow
            title="Nothing changes without a trace"
            body="Every quantity change flows through one path and writes an audit row. Who, when, why, and what it was before. There is no way around it, including from the API."
            visual={<AuditVisual />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  title,
  body,
  visual,
  reverse,
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <Reveal>
      <div
        className={cn(
          "group grid items-center gap-8 overflow-hidden rounded-[var(--r-2xl)] bg-[var(--layer-surface)] p-7 shadow-[var(--shadow-md)] transition-shadow duration-500 hover:shadow-[var(--shadow-lg)] lg:grid-cols-2 lg:gap-14 lg:p-12",
          reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div>
          <h3 className="mk-display text-[clamp(1.375rem,1.1rem+1vw,1.875rem)]">{title}</h3>
          <p className="mk-lede mt-4">{body}</p>
        </div>
        <div>{visual}</div>
      </div>
    </Reveal>
  );
}

function CoverVisual() {
  const rows = [
    { code: "HH-R2-12", days: 4, pct: 13, tone: "critical" as const },
    { code: "AB-CUT-115", days: 11, pct: 36, tone: "attention" as const },
    { code: "WD-TIP-08", days: 26, pct: 72, tone: "success" as const },
  ];
  return (
    <div className="rounded-[var(--r-lg)] bg-[var(--layer-elevated)] p-4">
      {rows.map((r) => (
        <div key={r.code} className="border-b border-[var(--line-subtle)] py-3 last:border-0">
          <div className="flex items-baseline justify-between">
            <span className="code text-[12px] font-semibold">{r.code}</span>
            <span
              className={cn(
                "num text-[12px] font-semibold",
                r.tone === "critical"
                  ? "text-[var(--critical-bright)]"
                  : r.tone === "attention"
                    ? "text-[var(--attention-bright)]"
                    : "text-[var(--success-bright)]",
              )}
            >
              {r.days} days left
            </span>
          </div>
          <Meter value={r.pct} tone={r.tone} className="mt-2" />
        </div>
      ))}
    </div>
  );
}

function DeadVisual() {
  return (
    <div className="rounded-[var(--r-lg)] bg-[var(--layer-elevated)] p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)]">
        Not moved in 90 days
      </p>
      <p className="num-hero mt-2 text-[30px] text-[var(--attention-bright)]">
        <CountUp to={612400} format={(n) => formatMoney(n)} />
      </p>
      <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
        across <CountUp to={318} /> lines
      </p>
      <div className="mt-4 flex items-end gap-1">
        {[38, 52, 30, 66, 44, 78, 56, 90, 62, 48, 70, 34].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[2px] bg-[var(--attention)] opacity-70"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}

function AuditVisual() {
  const rows = [
    { t: "09:42", who: "L. Kruger", what: "Receipt · PO-000118", v: "+240", tone: "text-[var(--success-bright)]" },
    { t: "09:18", who: "Stores", what: "Issued · JOB-4471", v: "−16", tone: "" },
    { t: "08:55", who: "Supervisor", what: "Count approved · ST-001042", v: "−6", tone: "text-[var(--critical-bright)]" },
    { t: "08:31", who: "L. Kruger", what: "Transfer out · DBN", v: "−10", tone: "" },
  ];
  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] bg-[var(--layer-elevated)]">
      {rows.map((r) => (
        <div
          key={r.t}
          className="flex items-center gap-3 border-b border-[var(--line-subtle)] px-4 py-2.5 last:border-0"
        >
          <span className="code text-[11px] text-[var(--text-quaternary)]">{r.t}</span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[11.5px] text-[var(--text-secondary)]">
              {r.what}
            </span>
            <span className="block text-[10.5px] text-[var(--text-quaternary)]">{r.who}</span>
          </div>
          <span className={cn("num text-[12px] font-semibold", r.tone)}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- 03 numbers */

/**
 * Real figures, in a strip that reads like an instrument panel. The money
 * value is abbreviated so it cannot outgrow its column - the exact rand is
 * carried in the footnote underneath it instead.
 */
const STATS = [
  { v: 2242, l: "Stock lines", sub: "under management", f: undefined },
  { v: 71704, l: "Units", sub: "tracked to a bin", f: undefined },
  {
    v: 1.103417,
    l: "Inventory value",
    sub: formatMoney(1103417),
    f: (n: number) => `R ${n.toFixed(2)}m`,
  },
  {
    v: 100,
    l: "Movements audited",
    sub: "no untraced change",
    f: (n: number) => `${Math.round(n)}%`,
  },
];

export function Numbers() {
  return (
    <section className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="mk-index">03</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              From the live deployment
            </span>
          </div>
          <div className="mk-rule mt-4" />
        </Reveal>

        <Reveal delay={80}>
          <div className="relative mt-10 overflow-hidden rounded-[var(--r-2xl)] bg-[var(--layer-surface)] shadow-[0_30px_80px_-40px_oklch(0_0_0_/_0.9),0_0_0_1px_var(--line)]">
            <div className="surface-sheen pointer-events-none absolute inset-0" />
            {/* The -1px margins push the outer cell borders under the
                container's overflow clip, so only the internal rules show. */}
            <div className="relative -mb-px -mr-px grid sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((s) => (
                <div
                  key={s.l}
                  className="border-b border-r border-[var(--line-subtle)] px-7 py-9"
                >
                  <p className="num-hero whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.5vw,2.5rem)] leading-none">
                    <CountUp to={s.v} format={s.f} />
                  </p>
                  <p className="mt-4 text-[13px] font-medium text-[var(--text-secondary)]">
                    {s.l}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-quaternary)]">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-7 max-w-2xl text-[12px] leading-relaxed text-[var(--text-quaternary)]">
            Figures from the production deployment at Eventspec Stores, not a
            projection. Nexus is early — this is what one operation currently
            runs on it, and we would rather show you that than a number we made
            up.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- 04 industries */

const INDUSTRIES = [
  { name: "Mining", icon: Mountain, note: "Consumables, rebuild stores, shutdown spares" },
  { name: "Manufacturing", icon: Factory, note: "Line-side stock and production issue" },
  { name: "Engineering", icon: Hammer, note: "Fittings, fasteners, workshop tooling" },
  { name: "Logistics", icon: Truck, note: "Multi-depot movement and transfers" },
  { name: "Warehousing", icon: Warehouse, note: "Bin-level control and cycle counts" },
  { name: "Energy", icon: Zap, note: "Critical spares and long lead times" },
  { name: "Construction", icon: Boxes, note: "Site issue against job and cost centre" },
  { name: "Agriculture", icon: Leaf, note: "Seasonal demand and workshop parts" },
];

export function Industries() {
  return (
    <section id="industries" className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-[84rem] px-6 lg:px-10">
        <SectionHead
          index="04"
          eyebrow="Industries"
          title="Built for places with a stores counter."
          lede="Anywhere parts are held, issued against a job, and counted at month end — the shape of the problem is the same."
        />

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((ind, i) => {
            const Icon = ind.icon;
            return (
              <Reveal key={ind.name} delay={i * 45}>
                <div className="group relative h-full overflow-hidden rounded-[var(--r-xl)] bg-[var(--layer-surface)] p-6 transition-all duration-400 hover:bg-[var(--layer-elevated)] hover:shadow-[var(--shadow-lg)]">
                  <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-[0.07]" />
                  <Icon className="relative size-5 text-[var(--text-tertiary)] transition-colors duration-300 group-hover:text-white" />
                  <p className="relative mt-8 text-[15px] font-semibold">{ind.name}</p>
                  <p className="relative mt-1.5 text-[12px] leading-snug text-[var(--text-quaternary)]">
                    {ind.note}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- 05 closing */

export function Closing() {
  return (
    <section id="company" className="relative overflow-hidden pt-24 lg:pt-32">
      <div className="mk-bloom pointer-events-none absolute inset-x-0 top-0 h-[36rem]" />
      <div className="mk-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[84rem] px-6 lg:px-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mk-display text-[clamp(2.25rem,1.5rem+3.4vw,4.5rem)]">
              Stop asking the storeman
              <br />
              <span className="bg-gradient-to-r from-white to-[oklch(0.62_0_0)] bg-clip-text text-transparent">
                whether you have it.
              </span>
            </h2>
            <p className="mk-lede mx-auto mt-6 max-w-lg">
              See Nexus running against a real stockroom — 2,242 lines, six
              store areas, live.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Cta href="/login">
                Book a demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Cta>
              <Cta href="/login" variant="ghost">
                Sign in
              </Cta>
            </div>
          </div>
        </Reveal>

        {/* Footer ---------------------------------------------------- */}
        <footer className="mt-28 border-t border-[var(--line-subtle)] pb-14 pt-12">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-[var(--r-md)] bg-[var(--layer-active)] ring-1 ring-inset ring-[var(--line-strong)]">
                  <span className="text-[13px] font-semibold tracking-[-0.02em] text-white">N</span>
                </span>
                <span className="text-[15px] font-semibold">Nexus</span>
              </div>
              <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-[var(--text-quaternary)]">
                The operating system for industrial operations. Built on a
                stockroom floor, not in a boardroom.
              </p>
            </div>

            {[
              { h: "Platform", l: ["Inventory", "Procurement", "Receiving", "Analytics"] },
              { h: "Industries", l: ["Mining", "Manufacturing", "Engineering", "Logistics"] },
              { h: "Company", l: ["About", "Contact", "Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-quaternary)]">
                  {col.h}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.l.map((l) => (
                    <li key={l}>
                      <a
                        href="/login"
                        className="text-[12.5px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-[var(--line-subtle)] pt-6">
            <p className="code text-[11px] text-[var(--text-disabled)]">
              © {new Date().getFullYear()} Nexus
            </p>
            <p className="code ml-auto text-[11px] text-[var(--text-disabled)]">
              Built in South Africa
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
