"use client";

import * as React from "react";

import { cn, formatQty } from "@/lib/utils";

/* ==========================================================================
 * Data display primitives.
 *
 * Everything here is inline SVG or CSS - no charting library. At this size
 * (sparklines a few dozen pixels wide, rings under 64px) a library costs more
 * in bundle and layout thrash than it saves, and these need to render inside
 * table cells by the hundred without dropping frames.
 * ========================================================================== */

type Tone = "neutral" | "success" | "attention" | "critical" | "nav" | "auto" | "ai" | "pending";

const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--text-tertiary)",
  success: "var(--success-bright)",
  attention: "var(--attention-bright)",
  critical: "var(--critical-bright)",
  nav: "var(--nav-bright)",
  auto: "var(--auto-bright)",
  ai: "var(--ai-bright)",
  pending: "var(--pending-bright)",
};

/* ------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  tone = "nav",
  width = 88,
  height = 26,
  filled = true,
  className,
}: {
  values: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  filled?: boolean;
  className?: string;
}) {
  const id = React.useId();

  if (values.length < 2) {
    return (
      <div
        className={cn("flex items-center", className)}
        style={{ width, height }}
        aria-hidden
      >
        <span className="h-px w-full bg-[var(--line)]" />
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  // Catmull-Rom style smoothing keeps the line readable at this size without
  // rounding away a genuine spike.
  const d = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      const [px, py] = points[i - 1];
      const cx = px + (x - px) / 2;
      return `C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
    })
    .join(" ");

  const colour = TONE_VAR[tone];
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="trend"
    >
      {filled ? (
        <>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity="0.26" />
              <stop offset="100%" stopColor={colour} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${d} L ${width - pad} ${height} L ${pad} ${height} Z`}
            fill={`url(#sp-${id})`}
          />
        </>
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={colour} />
    </svg>
  );
}

/* --------------------------------------------------------- animated count
 * Counts up on mount and on every value change. Uses rAF rather than a CSS
 * transition so the intermediate values are real numbers and stay formatted.
 */

export function AnimatedNumber({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const frameRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    // Honour the OS setting by collapsing the duration rather than skipping
    // the animation path, so the update still lands outside the effect body.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduced ? 0 : duration;

    const start = performance.now();
    const tick = (now: number) => {
      const t = ms === 0 ? 1 : Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {format ? format(display) : formatQty(Math.round(display))}
    </span>
  );
}

/* ------------------------------------------------------------ delta chip */

export function Delta({
  value,
  suffix = "%",
  invert = false,
  className,
}: {
  value: number | null;
  suffix?: string;
  /** For metrics where down is good - dead stock, cash locked up. */
  invert?: boolean;
  className?: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={cn("text-xs text-[var(--text-quaternary)]", className)}>—</span>;
  }

  const up = value > 0;
  const good = invert ? !up : up;
  const flat = Math.abs(value) < 0.05;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-[var(--r-xs)] px-1 py-0.5 text-[11px] font-semibold",
        flat
          ? "bg-[var(--layer-interactive)] text-[var(--text-tertiary)]"
          : good
            ? "bg-[var(--success-wash)] text-[var(--success-bright)]"
            : "bg-[var(--critical-wash)] text-[var(--critical-bright)]",
        className,
      )}
    >
      {flat ? "±" : up ? "▲" : "▼"}
      {Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}
      {suffix}
    </span>
  );
}

/* ----------------------------------------------------------- progress ring */

export function Ring({
  value,
  size = 44,
  stroke = 4,
  tone = "nav",
  label,
  className,
}: {
  /** 0–100. */
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: React.ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--layer-interactive)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_VAR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset var(--t-slow) var(--ease-out)" }}
        />
      </svg>
      {label ? (
        <span className="absolute inset-0 flex items-center justify-center">{label}</span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- bar meter */

export function Meter({
  value,
  tone = "nav",
  className,
}: {
  /** 0–100. */
  value: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-[var(--r-full)] bg-[var(--layer-interactive)]",
        className,
      )}
    >
      <div
        className="h-full rounded-[var(--r-full)]"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: TONE_VAR[tone],
          transition: "width var(--t-slow) var(--ease-out)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ status chip */

export function Chip({
  tone = "neutral",
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const wash: Record<Tone, string> = {
    neutral: "bg-[var(--layer-interactive)] text-[var(--text-secondary)] ring-[var(--line)]",
    success: "bg-[var(--success-wash)] text-[var(--success-bright)] ring-[oklch(0.62_0.08_158_/_0.24)]",
    attention: "bg-[var(--attention-wash)] text-[var(--attention-bright)] ring-[oklch(0.70_0.10_74_/_0.24)]",
    critical: "bg-[var(--critical-wash)] text-[var(--critical-bright)] ring-[oklch(0.58_0.13_25_/_0.26)]",
    nav: "bg-[var(--nav-wash)] text-[var(--nav-bright)] ring-[var(--line-strong)]",
    auto: "bg-[var(--auto-wash)] text-[var(--auto-bright)] ring-[oklch(0.66_0.03_245_/_0.24)]",
    ai: "bg-[var(--ai-wash)] text-[var(--ai-bright)] ring-[var(--line)]",
    pending: "bg-[var(--pending-wash)] text-[var(--pending-bright)] ring-[oklch(0.62_0.024_245_/_0.24)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r-sm)] px-2 py-[3px] text-[11px] font-medium leading-none ring-1 ring-inset",
        wash[tone],
        className,
      )}
    >
      {dot ? <span className="pulse-dot size-1.5" /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ section head */

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-quaternary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ skeleton */

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-sm)] bg-[var(--layer-elevated)]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-[oklch(1_0_0_/_0.05)] after:to-transparent",
        className,
      )}
    />
  );
}
