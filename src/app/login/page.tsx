import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {/* A single light source behind the mark, so the page has a focal point
          before any content loads. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[28%] size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] blur-[100px]"
        style={{ background: "var(--nav)" }}
      />

      <div className="animate-in-up relative flex w-full max-w-[380px] flex-col items-center">
        <div className="grid size-12 place-items-center rounded-[var(--r-lg)] bg-gradient-to-br from-[var(--nav)] to-[var(--nav-dim)] shadow-[var(--shadow-lg)]">
          <span className="text-[19px] font-bold tracking-tight text-white">N</span>
        </div>

        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Nexus</h1>
        <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">
          Industrial inventory operations
        </p>

        <div className="mt-7 w-full">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-[11px] text-[var(--text-disabled)]">
          Access is provisioned by your administrator
        </p>
      </div>
    </main>
  );
}
