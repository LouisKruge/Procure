"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase returns "Invalid login credentials" - fine, but say which
      // part the person can actually do something about.
      setError(
        /invalid login/i.test(error.message)
          ? "That email and password combination is not recognised."
          : friendlyError(error),
      );
      setBusy(false);
      return;
    }

    router.replace(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[12px] text-[var(--text-tertiary)]">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.co.za"
          className="h-12 bg-[var(--layer-sunken)] text-[14px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[12px] text-[var(--text-tertiary)]">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 bg-[var(--layer-sunken)] text-[14px]"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-out-subtle px-3 py-2 text-sm font-medium text-out"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="h-12 w-full shadow-[0_8px_24px_-8px_oklch(0.58_0.17_258_/_0.7)] transition-shadow hover:shadow-[0_14px_40px_-10px_oklch(0.58_0.17_258_/_0.9)]"
      >
        {busy ? <Loader2 className="animate-spin" /> : null}
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
