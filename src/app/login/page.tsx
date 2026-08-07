import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Nexus",
  description: "Sign in to Nexus.",
};

/* The three lines on the left are the product's actual promise, in the same
   voice as the landing page. No stock photography, no invented customers. */
const PROMISES = [
  {
    k: "01",
    h: "Every site, one number",
    p: "Quantities are held per site, not per company. What Workshop has is not what Rebuild has, and the system knows the difference.",
  },
  {
    k: "02",
    h: "Nothing moves unrecorded",
    p: "Receipts, issues, transfers and count adjustments all pass through one write path. The audit trail is not a feature you switch on.",
  },
  {
    k: "03",
    h: "Costed as it happens",
    p: "Weighted average is recalculated on every receipt, so valuation is a query, not a month-end exercise.",
  },
];

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[1.05fr_minmax(0,30rem)]">
      {/* Editorial half ------------------------------------------------ */}
      <aside className="mk-bloom mk-noise relative hidden overflow-hidden border-r border-[var(--line-subtle)] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="mk-grid pointer-events-none absolute inset-0" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[var(--r-md)] bg-gradient-to-br from-[var(--nav-bright)] to-[var(--nav-dim)] shadow-[0_4px_14px_-4px_oklch(0.58_0.17_258_/_0.8)]">
            <span className="text-[13px] font-bold text-white">N</span>
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Nexus</span>
        </Link>

        <div className="relative max-w-lg">
          <h2 className="mk-display text-[clamp(2rem,1.2rem+1.8vw,3rem)]">
            Built on a stockroom floor,
            <br />
            not in a boardroom.
          </h2>

          <div className="mt-12 space-y-8">
            {PROMISES.map((item) => (
              <div key={item.k} className="flex gap-5">
                <span className="mk-index pt-0.5">{item.k}</span>
                <div>
                  <p className="text-[14px] font-semibold tracking-[-0.01em]">{item.h}</p>
                  <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[var(--text-quaternary)]">
                    {item.p}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <span className="pulse-dot text-[var(--success-bright)]" />
          <p className="code text-[11px] text-[var(--text-disabled)]">
            2,242 lines · 6 store areas · live
          </p>
        </div>
      </aside>

      {/* Form half ------------------------------------------------------ */}
      <main className="relative flex min-h-dvh flex-col justify-center px-6 py-14 sm:px-10">
        <div
          className="pointer-events-none absolute left-1/2 top-[26%] size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.09] blur-[110px] lg:hidden"
          style={{ background: "var(--nav)" }}
        />

        <Link
          href="/"
          className="group absolute left-6 top-6 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] sm:left-10"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </Link>

        <div className="animate-in-up relative mx-auto w-full max-w-[22rem]">
          <div className="grid size-11 place-items-center rounded-[var(--r-lg)] bg-gradient-to-br from-[var(--nav-bright)] to-[var(--nav-dim)] shadow-[0_8px_24px_-8px_oklch(0.58_0.17_258_/_0.8)] lg:hidden">
            <span className="text-[17px] font-bold tracking-tight text-white">N</span>
          </div>

          <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.025em] lg:mt-0">
            Sign in
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
            Pick up where the floor left off.
          </p>

          <div className="mt-8">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-8 text-[11.5px] leading-relaxed text-[var(--text-disabled)]">
            Access is provisioned by your administrator. If you cannot get in,
            ask them to add your email to a site.
          </p>
        </div>
      </main>
    </div>
  );
}
