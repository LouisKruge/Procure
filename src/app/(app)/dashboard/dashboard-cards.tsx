"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn, formatMoney, formatQty } from "@/lib/utils";
import {
  AnimatedNumber,
  Chip,
  Meter,
  Ring,
  SectionLabel,
  Sparkline,
} from "@/components/ui/data-display";

/* ==========================================================================
 * Dashboard cards.
 *
 * Three hero cards carry the whole story: what is at risk, what it is
 * costing, and whether the place is moving. Everything below them is
 * detail. They are deliberately not identical - the eye should land on
 * risk first, and equal-weight cards make that impossible.
 * ========================================================================== */

/** Live clock + greeting. Client-side so it ticks and matches the viewer. */
export function Greeting({ name, site }: { name: string; site: string }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Deferred rather than set inline: the first paint has no clock, and
    // writing state during the effect body forces a second render pass.
    const first = setTimeout(() => setNow(new Date()), 0);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
    };
  }, []);

  const first = name.split(" ")[0];

  // The clock only exists after mount. Rendering a placeholder greeting on
  // the server and swapping it in would be a hydration mismatch, so the
  // whole line waits for the client rather than guessing an hour.
  const greeting = (() => {
    if (!now) return "Welcome back";
    const h = now.getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-w-0">
      <h1 className="text-[26px] font-semibold leading-none tracking-[-0.02em] sm:text-[30px]">
        {greeting}, {first}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-tertiary)]">
        <span>{site}</span>
        {now ? (
          <>
            <span className="text-[var(--text-disabled)]">·</span>
            <span className="num">
              {now.toLocaleDateString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="text-[var(--text-disabled)]">·</span>
            <span className="num">
              {now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- risk card
 * The loudest thing on the screen when it matters, and quiet when it does
 * not. Risk score is derived, not decorative: it weights stock-outs above
 * low lines and scales by the share of the range affected.
 */
export function RiskCard({
  stockedOut,
  low,
  totalLines,
  exposure,
}: {
  stockedOut: number;
  low: number;
  totalLines: number;
  exposure: number;
}) {
  const affected = stockedOut + low;

  // Service level: the share of the range that is actually available to
  // issue. A real inventory KPI rather than an invented score - it is the
  // number a stores manager is judged on, and it degrades honestly.
  const serviceLevel =
    totalLines > 0 ? ((totalLines - stockedOut) / totalLines) * 100 : 100;

  const level =
    stockedOut === 0 && low === 0
      ? { label: "Stable", tone: "success" as const }
      : serviceLevel < 95 || stockedOut > 25
        ? { label: "Critical", tone: "critical" as const }
        : stockedOut > 0
          ? { label: "Elevated", tone: "attention" as const }
          : { label: "Watch", tone: "pending" as const };

  return (
    <Link
      href="/procurement"
      className="surface surface-sheen edge-lit lift group relative overflow-hidden p-5"
    >
      {/* No severity wash. The plate stays graphite whatever the state - the
          figure, the ring and the chip carry the signal, and they only read
          as urgent because nothing around them is tinted. */}

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <SectionLabel>Inventory at risk</SectionLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedNumber
              value={affected}
              className={cn(
                "num-hero text-[44px]",
                level.tone === "critical"
                  ? "text-[var(--critical-bright)]"
                  : level.tone === "success"
                    ? "text-[var(--success-bright)]"
                    : "text-[var(--attention-bright)]",
              )}
            />
            <span className="text-[13px] text-[var(--text-tertiary)]">
              of {formatQty(totalLines)} lines
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Ring
            value={serviceLevel}
            size={56}
            tone={
              serviceLevel >= 99
                ? "success"
                : serviceLevel >= 95
                  ? "attention"
                  : "critical"
            }
            label={
              <span className="num text-[12px] font-semibold">
                {serviceLevel.toFixed(serviceLevel >= 99.95 ? 0 : 1)}
              </span>
            }
          />
          <span className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--text-quaternary)]">
            available
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <Chip tone={level.tone} dot={level.tone === "critical"}>
          {level.label}
        </Chip>
      </div>

      {/* Breakdown earns the height rather than leaving the card half empty. */}
      <div className="relative mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--r-md)] bg-[var(--line-subtle)]">
        <Stat
          label="At zero"
          value={formatQty(stockedOut)}
          tone={stockedOut > 0 ? "critical" : undefined}
        />
        <Stat
          label="Below min"
          value={formatQty(low)}
          tone={low > 0 ? "attention" : undefined}
        />
        <Stat label="Exposure" value={formatMoney(exposure)} small />
      </div>

      <span className="relative mt-3 flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] opacity-0 transition-opacity group-hover:opacity-100">
        Review procurement <ArrowUpRight className="size-3" />
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone?: "critical" | "attention";
  small?: boolean;
}) {
  return (
    <div className="bg-[var(--layer-surface)] px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--text-quaternary)]">
        {label}
      </p>
      <p
        className={cn(
          "num mt-0.5 font-semibold",
          small ? "text-[12px]" : "text-[17px]",
          tone === "critical"
            ? "text-[var(--critical-bright)]"
            : tone === "attention"
              ? "text-[var(--attention-bright)]"
              : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ value card */
export function ValueCard({
  totalValue,
  deadValue,
  deadLines,
  totalLines,
}: {
  totalValue: number;
  deadValue: number;
  deadLines: number;
  totalLines: number;
}) {
  const deadShare = totalValue > 0 ? (deadValue / totalValue) * 100 : 0;
  const healthy = 100 - deadShare;

  return (
    <Link href="/analytics" className="surface surface-sheen edge-lit lift group p-5">
      <SectionLabel>Cash in inventory</SectionLabel>

      <div className="mt-2">
        <AnimatedNumber
          value={totalValue}
          format={(n) => formatMoney(n)}
          className="num-hero block text-[38px] tracking-[-0.04em]"
        />
        <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
          across {formatQty(totalLines)} stocked lines
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--text-tertiary)]">Moving</span>
          <span className="num font-semibold text-[var(--success-bright)]">
            {healthy.toFixed(0)}%
          </span>
        </div>
        <Meter value={healthy} tone="success" />

        <div className="flex items-center justify-between pt-1 text-[12px]">
          <span className="text-[var(--text-tertiary)]">
            Dead stock · {formatQty(deadLines)} lines
          </span>
          <span className="num font-semibold text-[var(--attention-bright)]">
            {formatMoney(deadValue)}
          </span>
        </div>
        <Meter value={deadShare} tone="attention" />
      </div>

      <span className="mt-4 flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] opacity-0 transition-opacity group-hover:opacity-100">
        Open analytics <ArrowUpRight className="size-3" />
      </span>
    </Link>
  );
}

/* --------------------------------------------------------- activity card */
export function ThroughputCard({
  issued,
  received,
  series,
  periodLabel,
}: {
  issued: number;
  received: number;
  series: { out: number[]; in: number[] };
  periodLabel: string;
}) {
  const quiet = issued === 0 && received === 0;

  return (
    <Link href="/analytics" className="surface surface-sheen edge-lit lift group p-5">
      <div className="flex items-start justify-between">
        <SectionLabel>Throughput · {periodLabel}</SectionLabel>
        {quiet ? null : <Chip tone="auto" dot>Live</Chip>}
      </div>

      {quiet ? (
        <div className="mt-4">
          <p className="num-hero text-[38px] text-[var(--text-quaternary)]">—</p>
          <p className="mt-2 max-w-[24ch] text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            Nothing booked in or out yet. This fills in from the first movement.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Issued</p>
              <AnimatedNumber
                value={issued}
                className="num-hero block text-[28px] text-white"
              />
              <Sparkline values={series.out} tone="nav" width={104} height={26} />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Received</p>
              <AnimatedNumber
                value={received}
                className="num-hero block text-[28px] text-[var(--text-secondary)]"
              />
              <Sparkline values={series.in} tone="neutral" width={104} height={26} />
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--line-subtle)] pt-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-tertiary)]">Net movement</span>
              <span
                className={cn(
                  "num font-semibold",
                  received - issued >= 0
                    ? "text-[var(--success-bright)]"
                    : "text-[var(--attention-bright)]",
                )}
              >
                {received - issued >= 0 ? "+" : ""}
                {formatQty(received - issued)} units
              </span>
            </div>
          </div>
        </>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------ panel shell */
export function Panel({
  title,
  count,
  tone = "neutral",
  action,
  children,
  empty,
  emptyLabel,
}: {
  title: string;
  count?: number;
  tone?: "neutral" | "critical" | "attention" | "pending" | "auto";
  action?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <section className="surface edge-lit flex flex-col overflow-hidden">
      <header className="flex h-12 items-center gap-2.5 px-4">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {count !== undefined && count > 0 ? (
          <Chip tone={tone === "neutral" ? "neutral" : tone}>{count}</Chip>
        ) : null}
        <div className="ml-auto">{action}</div>
      </header>

      {empty ? (
        <div className="flex flex-col items-center gap-1.5 px-4 pb-8 pt-4 text-center">
          <div className="grid size-9 place-items-center rounded-full bg-[var(--success-wash)]">
            <span className="text-[var(--success-bright)]">✓</span>
          </div>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            {emptyLabel ?? "Nothing needs attention"}
          </p>
        </div>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- feed row */
export function FeedRow({
  href,
  code,
  title,
  meta,
  value,
  valueLabel,
  tone,
  chip,
}: {
  href: string;
  code?: string;
  title: string;
  meta: string;
  value?: React.ReactNode;
  valueLabel?: string;
  tone?: "critical" | "attention" | "pending" | "auto" | "success";
  chip?: React.ReactNode;
}) {
  const toneClass = {
    critical: "text-[var(--critical-bright)]",
    attention: "text-[var(--attention-bright)]",
    pending: "text-[var(--pending-bright)]",
    auto: "text-[var(--auto-bright)]",
    success: "text-[var(--success-bright)]",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--layer-interactive)]",
        tone && "rail",
        tone && toneClass[tone],
      )}
    >
      <div className="min-w-0 flex-1 pl-2">
        <div className="flex items-center gap-2">
          {code ? (
            <span className="code truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
              {code}
            </span>
          ) : null}
          {chip}
        </div>
        <p className="truncate text-[12.5px] text-[var(--text-secondary)]">{title}</p>
        <p className="truncate text-[11px] text-[var(--text-quaternary)]">{meta}</p>
      </div>

      {value !== undefined ? (
        <div className="shrink-0 text-right">
          <div className="num text-[13px] font-semibold">{value}</div>
          {valueLabel ? (
            <p className="text-[10.5px] text-[var(--text-quaternary)]">{valueLabel}</p>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
