"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ==========================================================================
 * Marketing navigation.
 *
 * Transparent over the hero, then condenses into a floating bar once you
 * leave it. One mega menu, built properly, rather than six half-built ones -
 * a dropdown that opens onto nothing reads worse than no dropdown.
 * ========================================================================== */

const PLATFORM = [
  {
    group: "Operations",
    items: [
      { label: "Inventory", desc: "Per-site quantities, live" },
      { label: "Receiving", desc: "Book in against a PO or ad-hoc" },
      { label: "Dispatch", desc: "Issue to job, cost centre or customer" },
      { label: "Transfers", desc: "Site to site, with in-transit state" },
    ],
  },
  {
    group: "Control",
    items: [
      { label: "Procurement", desc: "Reorder suggestions to purchase order" },
      { label: "Stock takes", desc: "Cycle counts with an approval gate" },
      { label: "Costing", desc: "Weighted average, fully traced" },
      { label: "Audit trail", desc: "Every movement, every person" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "Analytics", desc: "Velocity, dead stock, days of cover" },
      { label: "Forecasting", desc: "Predicted stockouts from real usage" },
      { label: "Reporting", desc: "Valuation and movement exports" },
      { label: "Bin labels", desc: "Scannable barcodes, print-ready" },
    ],
  },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[padding] duration-500",
        scrolled ? "pt-3" : "pt-0",
      )}
      onMouseLeave={() => setOpenMenu(false)}
    >
      <div
        className={cn(
          "mx-auto flex items-center gap-2 transition-all duration-500",
          scrolled
            ? // The bar floats over live dashboard panels, so the fill has to
              // carry legibility on its own - backdrop blur is a bonus, not
              // the plan.
              "glass h-14 max-w-5xl rounded-[var(--r-xl)] bg-[oklch(0.08_0_0_/_0.92)] px-4 ring-1 ring-inset ring-[var(--line)] shadow-[var(--shadow-xl)]"
            : "h-20 max-w-[84rem] px-6 lg:px-10",
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[var(--r-md)] bg-[var(--layer-active)] ring-1 ring-inset ring-[var(--line-strong)]">
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-white">N</span>
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Nexus</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          <button
            type="button"
            onMouseEnter={() => setOpenMenu(true)}
            onClick={() => setOpenMenu((v) => !v)}
            className={cn(
              "rounded-[var(--r-md)] px-3 py-2 text-[13px] font-medium transition-colors",
              openMenu
                ? "bg-[oklch(1_0_0_/_0.06)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
            )}
            aria-expanded={openMenu}
          >
            Platform
          </button>
          {["Industries", "Pricing", "Company"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              onMouseEnter={() => setOpenMenu(false)}
              className="rounded-[var(--r-md)] px-3 py-2 text-[13px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-[var(--r-md)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="group inline-flex h-9 items-center gap-1.5 rounded-[var(--r-md)] bg-white px-4 text-[13px] font-medium text-[#0A0A0A] transition-[background-color,transform] hover:bg-[oklch(0.93_0_0)] active:scale-[0.985]"
          >
            Book a demo
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => setMobile((v) => !v)}
            className="grid size-9 place-items-center rounded-[var(--r-md)] text-[var(--text-secondary)] lg:hidden"
            aria-label="Menu"
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mega menu ---------------------------------------------------- */}
      <div
        className={cn(
          "mx-auto hidden max-w-5xl overflow-hidden px-4 transition-[max-height,opacity] duration-400 lg:block",
          openMenu ? "max-h-[26rem] opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <div className="mt-2 grid grid-cols-3 gap-8 rounded-[var(--r-xl)] bg-[var(--layer-floating)] p-7 shadow-[var(--shadow-xl)]">
          {PLATFORM.map((col) => (
            <div key={col.group}>
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-quaternary)]">
                {col.group}
              </p>
              <ul className="space-y-0.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href="/login"
                      className="block rounded-[var(--r-md)] px-3 py-2 transition-colors hover:bg-[var(--layer-interactive)]"
                    >
                      <span className="block text-[13px] font-medium">{item.label}</span>
                      <span className="block text-[11.5px] text-[var(--text-quaternary)]">
                        {item.desc}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile ------------------------------------------------------- */}
      {mobile ? (
        <div className="mx-4 mt-2 rounded-[var(--r-xl)] bg-[var(--layer-floating)] p-4 shadow-[var(--shadow-xl)] lg:hidden">
          {PLATFORM.flatMap((c) => c.items)
            .slice(0, 6)
            .map((item) => (
              <Link
                key={item.label}
                href="/login"
                onClick={() => setMobile(false)}
                className="block rounded-[var(--r-md)] px-3 py-2.5 text-[14px] font-medium transition-colors hover:bg-[var(--layer-interactive)]"
              >
                {item.label}
              </Link>
            ))}
          <Link
            href="/login"
            className="mt-2 block rounded-[var(--r-md)] bg-white px-3 py-3 text-center text-[14px] font-medium text-[#0A0A0A]"
          >
            Sign in
          </Link>
        </div>
      ) : null}
    </header>
  );
}
