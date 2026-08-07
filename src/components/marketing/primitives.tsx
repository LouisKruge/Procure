"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/* ==========================================================================
 * Marketing primitives.
 *
 * Deliberately small. The page gets its character from typography, spacing
 * and light rather than from a component library, so these are just the
 * pieces that repeat.
 * ========================================================================== */

/**
 * Reveals children once they enter the viewport. IntersectionObserver rather
 * than scroll listeners: it costs nothing while idle and never fights the
 * compositor.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown}
      className={cn("mk-reveal", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Section header with a drawing-sheet index mark and datum rule. */
export function SectionHead({
  index,
  eyebrow,
  title,
  lede,
  className,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <Reveal>
        <div className="flex items-center gap-4">
          <span className="mk-index">{index}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            {eyebrow}
          </span>
        </div>
        <div className="mk-rule mt-4" />
      </Reveal>

      <Reveal delay={80}>
        <h2 className="mk-display mt-8 text-[clamp(2rem,1.4rem+2.6vw,3.5rem)]">{title}</h2>
      </Reveal>

      {lede ? (
        <Reveal delay={150}>
          <p className="mk-lede mt-5 max-w-xl">{lede}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/**
 * Primary call to action. Tracks the pointer so the highlight gathers under
 * the cursor - the whole "magnetic" feel is one CSS variable.
 */
export function Cta({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Link
      href={href}
      onMouseMove={onMove}
      className={cn(
        "mk-cta group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-lg)] px-6 text-[14px] font-semibold",
        "transition-[transform,box-shadow,background-color] duration-200 active:scale-[0.98]",
        variant === "primary"
          ? "bg-white text-[#0A0A0A] hover:bg-[oklch(0.93_0_0)]"
          : "bg-[oklch(1_0_0_/_0.04)] text-[var(--text-secondary)] hover:bg-[oklch(1_0_0_/_0.08)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Counts a number up when it scrolls into view. */
export function CountUp({
  to,
  format,
  duration = 1400,
  className,
}: {
  to: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setValue(to);
          return;
        }

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          setValue(to * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? format(value) : Math.round(value).toLocaleString()}
    </span>
  );
}
