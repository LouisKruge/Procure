"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Site } from "@/lib/session";

const SITE_COOKIE = "nexus_site";

/**
 * The site filter is global rather than per-screen: whichever site you pick
 * here is the one every screen answers for until you change it. It is kept
 * in a cookie so server components can read it on the first paint instead
 * of flashing all-sites data and then narrowing.
 */
export function SiteSwitcher({
  sites,
  siteId,
  allowAll,
}: {
  sites: Site[];
  siteId: string | null;
  allowAll: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    document.cookie = `${SITE_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  // A single-site user has nothing to switch between - show it as a label.
  if (sites.length <= 1 && !allowAll) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-input bg-card px-3 text-sm font-semibold">
        <Building2 className="size-4 text-muted-foreground" />
        {sites[0]?.code ?? "—"}
      </div>
    );
  }

  return (
    <Select value={siteId ?? "all"} onValueChange={onChange}>
      <SelectTrigger className="w-full min-w-[9.5rem] sm:w-auto" aria-label="Site filter">
        <span className="flex items-center gap-2 truncate">
          {pending ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
          )}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value="all">All sites</SelectItem> : null}
        {sites.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.code} — {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
