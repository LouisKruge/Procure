"use client";

import * as React from "react";
import { ArrowRight, Boxes, Check, TrendingDown, Zap } from "lucide-react";

import { cn, formatMoney, formatQty } from "@/lib/utils";
import { Chip, Meter, Ring, Sparkline } from "@/components/ui/data-display";

import { Cta, Reveal } from "./primitives";

/* ==========================================================================
 * Hero.
 *
 * The product is the hero - no stock photography, no abstract 3D. What
 * floats over the fold is the real interface, built from the same
 * components the application uses, so what you see is what you get.
 *
 * Parallax is pointer-driven and clamped hard. On a page selling precision,
 * a panel that swings about undermines the argument.
 * ========================================================================== */

const OUT_SERIES = [42, 61, 38, 90, 72, 110, 84, 128, 96, 141];
const IN_SERIES = [50, 30, 72, 41, 98, 64, 120, 96, 132, 104];

export function Hero() {
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const frame = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Coarse pointers get no tilt: it would only fight the scroll.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    function onMove(e: MouseEvent) {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        setTilt({ x: nx, y: ny });
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <section className="mk-bloom mk-noise relative overflow-hidden pt-32 lg:pt-36">
      <div className="mk-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[84rem] px-6 lg:px-10">
        {/* Copy ------------------------------------------------------- */}
        <div className="max-w-5xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-[oklch(1_0_0_/_0.05)] py-1.5 pl-1.5 pr-3.5 text-[12px] text-[var(--text-tertiary)]">
              <span className="rounded-full bg-[oklch(1_0_0_/_0.09)] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white">
                Live
              </span>
              Running 2,242 stock lines in production
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mk-display mt-6 text-[clamp(2rem,1.4rem+3.8vw,4.5rem)]">
              The operating system
              <br />
              for industrial{" "}
              <span className="bg-gradient-to-r from-white to-[oklch(0.66_0_0)] bg-clip-text text-transparent">
                operations.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mk-lede mt-6 max-w-xl">
              Stock, procurement, receiving, dispatch and costing in one system
              that knows what you hold, what it cost, and what runs out next
              Thursday. Built for the person running the floor.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Cta href="/login">
                Book a demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Cta>
              <Cta href="/login" variant="ghost">
                Sign in
              </Cta>
            </div>
          </Reveal>

          <Reveal delay={310}>
            <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-[12.5px] text-[var(--text-quaternary)]">
              {[
                "Per-site quantities, not one global number",
                "Every movement audited",
                "Works on a tablet with gloves on",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[var(--success-bright)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Product ---------------------------------------------------- */}
        <div className="relative mt-16 lg:mt-20" style={{ perspective: "1800px" }}>
          <Reveal delay={200}>
            <div
              className="relative will-change-transform"
              style={{
                transform: `rotateX(${(-tilt.y * 2.4).toFixed(2)}deg) rotateY(${(tilt.x * 3).toFixed(2)}deg)`,
                transition: "transform 500ms var(--ease-out)",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Light behind the glass */}
              <div className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 rounded-[3rem] bg-[radial-gradient(60%_50%_at_50%_0%,oklch(1_0_0_/_0.07),transparent_70%)] blur-2xl" />

              <div className="relative overflow-hidden rounded-[var(--r-2xl)] bg-[var(--layer-surface)] shadow-[0_40px_120px_-24px_oklch(0_0_0_/_0.8),0_0_0_1px_var(--line)]">
                <div className="surface-sheen pointer-events-none absolute inset-0 rounded-[var(--r-2xl)]" />

                {/* Chrome */}
                <div className="flex h-11 items-center gap-2 border-b border-[var(--line-subtle)] px-4">
                  <div className="flex gap-1.5">
                    {["var(--critical)", "var(--attention)", "var(--success)"].map((c) => (
                      <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="code ml-3 text-[11px] text-[var(--text-quaternary)]">
                    nexus / eventspec stores / overview
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--text-quaternary)]">
                    <span className="pulse-dot text-[var(--success-bright)]" />
                    live
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.1fr_1fr_1fr]">
                  <RiskPanel />
                  <ValuePanel />
                  <FlowPanel />
                </div>

                <div className="grid gap-3 px-4 pb-5 sm:px-5 lg:grid-cols-[1.35fr_1fr]">
                  <OrderPanel />
                  <ActivityPanel />
                </div>
              </div>

              {/* Floating panels: real UI, lifted off the surface. */}
              <FloatingCard
                className="-left-10 top-1/3 hidden 2xl:block"
                depth={40}
                tilt={tilt}
                delay="0.9s"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-[var(--r-sm)] bg-[var(--ai-wash)]">
                    <Zap className="size-3.5 text-[var(--ai-bright)]" />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold">Predicted stockout</p>
                    <p className="code text-[10.5px] text-[var(--text-quaternary)]">
                      HH-R2-12 · 4 days
                    </p>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                className="-right-10 top-20 hidden 2xl:block"
                depth={64}
                tilt={tilt}
                delay="1.15s"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-[var(--r-sm)] bg-[var(--success-wash)]">
                    <Check className="size-3.5 text-[var(--success-bright)]" />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold">Receipt posted</p>
                    <p className="code text-[10.5px] text-[var(--text-quaternary)]">
                      PO-000118 · +240 EA
                    </p>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                className="-right-8 bottom-16 hidden 2xl:block"
                depth={30}
                tilt={tilt}
                delay="1.4s"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-[var(--r-sm)] bg-[var(--pending-wash)]">
                    <Boxes className="size-3.5 text-[var(--pending-bright)]" />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold">Count awaiting approval</p>
                    <p className="code text-[10.5px] text-[var(--text-quaternary)]">
                      ST-001042 · 18 lines out
                    </p>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </Reveal>

          {/* Fade the product into the next section rather than cutting it. */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-40 bg-gradient-to-b from-transparent to-[var(--layer-base)]" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- panels */

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-lg)] bg-[var(--layer-elevated)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)]">
      {children}
    </p>
  );
}

function RiskPanel() {
  return (
    <Panel>
      <div className="relative flex items-start justify-between">
        <div>
          <Label>Inventory at risk</Label>
          <p className="num-hero mt-2 text-[34px] text-[var(--attention-bright)]">76</p>
          <p className="mt-1 text-[11px] text-[var(--text-quaternary)]">of 2,242 lines</p>
        </div>
        <Ring
          value={99.4}
          size={46}
          tone="success"
          label={<span className="num text-[10.5px] font-semibold">99.4</span>}
        />
      </div>
      <div className="relative mt-3.5 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--r-sm)] bg-[var(--line-subtle)]">
        {[
          { l: "At zero", v: "14", t: "text-[var(--critical-bright)]" },
          { l: "Below min", v: "62", t: "text-[var(--attention-bright)]" },
          { l: "Exposure", v: "R184k", t: "" },
        ].map((s) => (
          <div key={s.l} className="bg-[var(--layer-elevated)] px-2 py-1.5">
            <p className="text-[8.5px] uppercase tracking-[0.06em] text-[var(--text-quaternary)]">
              {s.l}
            </p>
            <p className={cn("num text-[13px] font-semibold", s.t)}>{s.v}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ValuePanel() {
  return (
    <Panel>
      <Label>Cash in inventory</Label>
      <p className="num-hero mt-2 text-[26px]">{formatMoney(1103417.53)}</p>
      <p className="mt-1 text-[11px] text-[var(--text-quaternary)]">2,242 stocked lines</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-tertiary)]">Moving</span>
          <span className="num font-semibold text-[var(--success-bright)]">86%</span>
        </div>
        <Meter value={86} tone="success" />
        <div className="flex items-center justify-between pt-0.5 text-[11px]">
          <span className="text-[var(--text-tertiary)]">Dead stock</span>
          <span className="num font-semibold text-[var(--attention-bright)]">R612k</span>
        </div>
        <Meter value={14} tone="attention" />
      </div>
    </Panel>
  );
}

function FlowPanel() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <Label>Throughput</Label>
        <Chip tone="auto" dot>
          Live
        </Chip>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10.5px] text-[var(--text-tertiary)]">Issued</p>
          <p className="num-hero text-[20px] text-white">1,284</p>
          <Sparkline values={OUT_SERIES} tone="nav" width={92} height={24} />
        </div>
        <div>
          <p className="text-[10.5px] text-[var(--text-tertiary)]">Received</p>
          <p className="num-hero text-[20px] text-[var(--success-bright)]">960</p>
          <Sparkline values={IN_SERIES} tone="success" width={92} height={24} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--line-subtle)] pt-2.5 text-[11px]">
        <span className="text-[var(--text-tertiary)]">Net</span>
        <span className="num font-semibold text-[var(--attention-bright)]">−324 units</span>
      </div>
    </Panel>
  );
}

function OrderPanel() {
  const rows = [
    { code: "FIT-AW-07", desc: "Cap 7/16 JIC Fem SW", meta: "bin RA-01 · Pirtek", qty: 0, min: 6, tone: "critical" as const, chip: "Out" },
    { code: "CON-AA-06", desc: "M8×60 Hex Bolt", meta: "bin AA-06 · RB", qty: 184, min: 184, tone: "attention" as const, chip: "~4 days" },
    { code: "ELE-T/PX1BW", desc: "M20 BWR Gland", meta: "bin RK-04 · TTS", qty: 9, min: 3, tone: "attention" as const, chip: "Below min" },
  ];

  return (
    <Panel className="p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-[12px] font-semibold">Needs ordering</p>
        <span className="rounded-[var(--r-xs)] bg-[var(--critical-wash)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--critical-bright)]">
          76
        </span>
      </div>
      <div>
        {rows.map((r) => (
          <div
            key={r.code}
            className={cn(
              "rail flex items-center gap-3 px-4 py-2",
              r.tone === "critical"
                ? "text-[var(--critical-bright)]"
                : "text-[var(--attention-bright)]",
            )}
          >
            <div className="min-w-0 flex-1 pl-2">
              <div className="flex items-center gap-2">
                <span className="code text-[11.5px] font-semibold text-[var(--text-primary)]">
                  {r.code}
                </span>
                <Chip tone={r.tone}>{r.chip}</Chip>
              </div>
              <p className="truncate text-[11.5px] text-[var(--text-secondary)]">{r.desc}</p>
              <p className="truncate text-[10.5px] text-[var(--text-quaternary)]">{r.meta}</p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "num text-[12.5px] font-semibold",
                  r.qty === 0 ? "text-[var(--critical-bright)]" : "text-[var(--text-primary)]",
                )}
              >
                {formatQty(r.qty)}
              </p>
              <p className="text-[10px] text-[var(--text-quaternary)]">min {r.min}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityPanel() {
  const rows = [
    { code: "CON-AB-14", desc: "M10×50 Hex Bolt", meta: "Stock received · today", v: "+240", tone: "text-[var(--success-bright)]" },
    { code: "FIT-JF1-09-06", desc: "9/16 JIC Fem Str", meta: "Issued to job · today", v: "−16", tone: "" },
    { code: "BR-6205-2RS", desc: "Bearing 6205 2RS", meta: "Transfer out · today", v: "−10", tone: "" },
  ];

  return (
    <Panel className="p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-[12px] font-semibold">Warehouse activity</p>
        <TrendingDown className="ml-auto size-3.5 text-[var(--text-quaternary)]" />
      </div>
      <div>
        {rows.map((r) => (
          <div key={r.code} className="flex items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <span className="code block truncate text-[11.5px] font-semibold">{r.code}</span>
              <p className="truncate text-[10.5px] text-[var(--text-quaternary)]">{r.meta}</p>
            </div>
            <span className={cn("num text-[12.5px] font-semibold", r.tone)}>{r.v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Panel that floats off the main surface and drifts with the pointer. */
function FloatingCard({
  children,
  className,
  depth,
  tilt,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  depth: number;
  tilt: { x: number; y: number };
  delay: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-10 rounded-[var(--r-lg)] bg-[var(--layer-floating)] px-3.5 py-2.5",
        "shadow-[0_20px_50px_-16px_oklch(0_0_0_/_0.75),0_0_0_1px_var(--line)]",
        "animate-in-up",
        className,
      )}
      style={{
        transform: `translate3d(${(tilt.x * depth).toFixed(1)}px, ${(tilt.y * depth * 0.5).toFixed(1)}px, 60px)`,
        transition: "transform 700ms var(--ease-out)",
        animationDelay: delay,
      }}
    >
      {children}
    </div>
  );
}
