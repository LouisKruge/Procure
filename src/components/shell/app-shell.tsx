"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  LogOut,
  PackagePlus,
  Scale,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Chip } from "@/components/ui/data-display";
import { CommandPalette } from "@/components/command-palette";
import { SiteSwitcher } from "@/components/site-switcher";
import type { Site } from "@/lib/session";

import { MobileBar, Sidebar } from "./sidebar";

export type Alerts = { critical: number; attention: number; approvals: number };

/* Quick create targets. Shift+key from anywhere. */
const CREATE_ACTIONS = [
  { href: "/counter", label: "Counter", desc: "Book stock out or back in", icon: Scale, key: "B" },
  { href: "/dispatch/new", label: "Dispatch", desc: "Issue stock out", icon: Truck, key: "D" },
  { href: "/receiving", label: "Receipt", desc: "Book stock in", icon: PackagePlus, key: "R" },
  { href: "/transfers/new", label: "Transfer", desc: "Move between sites", icon: ArrowLeftRight, key: "T" },
  { href: "/procurement", label: "Purchase order", desc: "From reorder suggestions", icon: ShoppingCart, key: "P" },
  { href: "/stock-takes", label: "Stock take", desc: "Start a count", icon: ClipboardCheck, key: "S" },
];

export function AppShell({
  children,
  fullName,
  email,
  role,
  sites,
  siteId,
  siteName,
  siteCode,
  allowAll,
  alerts,
}: {
  children: React.ReactNode;
  fullName: string;
  email: string;
  role: string;
  sites: Site[];
  siteId: string | null;
  siteName: string;
  siteCode: string;
  allowAll: boolean;
  /* Unresolved on purpose - see the layout. */
  alerts: Promise<Alerts>;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  /* --------------------------------------------------------- shortcuts
   * Shift+letter jumps straight to a create flow. Ignored while typing so
   * a description containing "d" never fires a dispatch.
   */
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;

      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setCreateOpen(true);
        return;
      }

      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const match = CREATE_ACTIONS.find((a) => a.key === e.key.toUpperCase());
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="relative z-10 flex min-h-dvh">
      <Sidebar siteName={siteName} siteCode={siteCode} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar ------------------------------------------------------ */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-[var(--layer-chrome)] px-3 sm:px-5">
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid size-7 place-items-center rounded-[var(--r-sm)] bg-[var(--brass)]">
              <span className="text-[11px] font-bold text-[#0B0A08]">N</span>
            </span>
          </Link>

          {/* Live status. Streams in behind the shell rather than holding
              it up - see the layout for why. */}
          <div className="hidden items-center gap-2 lg:flex">
            <React.Suspense
              fallback={
                <span className="h-[22px] w-40 rounded-[var(--r-sm)] bg-[var(--layer-interactive)]" />
              }
            >
              <LiveStatus alerts={alerts} />
            </React.Suspense>
            <Link
              href="/reports"
              className="inline-flex h-[26px] items-center gap-1 rounded-[var(--r-sm)] px-2.5 text-[11.5px] text-[var(--text-tertiary)] ring-1 ring-inset ring-[var(--line)] transition-colors hover:text-[var(--text-primary)] hover:ring-[var(--line-strong)]"
            >
              System status
              <ChevronRight className="size-3" />
            </Link>
          </div>

          {/* Command bar. The one search on the screen, centred, so it reads
              as the way in rather than as a field on a form. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group mx-auto flex h-9 w-full max-w-[26rem] items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--layer-sunken)] px-3 text-left ring-1 ring-inset ring-[var(--line)] transition-colors hover:bg-[var(--layer-surface)] hover:ring-[var(--line-strong)]"
          >
            <Search className="size-4 shrink-0 text-[var(--text-quaternary)]" />
            <span className="flex-1 truncate text-[13px] text-[var(--text-quaternary)]">
              Search or type a command…
            </span>
            <kbd className="kbd hidden sm:inline-flex">⌘K</kbd>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <SiteSwitcher sites={sites} siteId={siteId} allowAll={allowAll} />

            <button
              type="button"
              onClick={() => router.push("/procurement")}
              className="relative grid size-9 place-items-center rounded-[var(--r-md)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--layer-interactive)] hover:text-[var(--text-primary)]"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <React.Suspense fallback={null}>
                <BellBadge alerts={alerts} />
              </React.Suspense>
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="hidden size-9 place-items-center rounded-[var(--r-md)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--layer-interactive)] hover:text-[var(--text-primary)] sm:grid"
              aria-label="Create"
              title="Create — press C"
            >
              <CircleHelp className="size-[18px]" />
            </button>

            <ProfileMenu fullName={fullName} email={email} role={role} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 pb-24 pt-5 sm:px-5 lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      <MobileBar onOpenSearch={() => setSearchOpen(true)} />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickCreate open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/* ---------------------------------------------------------------- alerts */

function LiveStatus({ alerts }: { alerts: Promise<Alerts> }) {
  const { critical, attention, approvals } = React.use(alerts);

  return (
    <>
      <Chip tone={critical > 0 ? "critical" : "success"} dot>
        {critical > 0 ? `${critical} critical` : "All clear"}
      </Chip>
      {attention > 0 ? <Chip tone="attention">{attention} low</Chip> : null}
      {approvals > 0 ? <Chip tone="pending">{approvals} to approve</Chip> : null}
    </>
  );
}

function BellBadge({ alerts }: { alerts: Promise<Alerts> }) {
  const { critical, approvals } = React.use(alerts);
  const total = critical + approvals;
  if (total === 0) return null;

  return (
    <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--critical)] px-1 text-[9px] font-semibold text-white">
      {total > 99 ? "99+" : total}
    </span>
  );
}

/* ------------------------------------------------------------ quick create */

function QuickCreate({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--layer-overlay)] p-4 pt-[18vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-label="Create"
        className="animate-in-up w-full max-w-md overflow-hidden rounded-[var(--r-xl)] bg-[var(--layer-modal)] shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--line-subtle)] px-4 py-3">
          <p className="text-[13px] font-semibold">Create</p>
          <p className="text-[11px] text-[var(--text-quaternary)]">
            Or press Shift and the letter from anywhere
          </p>
        </div>
        <div className="stagger p-2">
          {CREATE_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.href}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push(a.href);
                }}
                className="flex w-full items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--layer-interactive)]"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--layer-interactive)]">
                  <Icon className="size-4 text-[var(--text-secondary)]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{a.label}</span>
                  <span className="block text-[11px] text-[var(--text-quaternary)]">
                    {a.desc}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">⇧</kbd>
                  <kbd className="kbd">{a.key}</kbd>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ profile menu */

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  site_supervisor: "Supervisor",
  staff: "Stores",
};

function ProfileMenu({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-[var(--r-md)] pl-1 pr-1.5 transition-colors hover:bg-[var(--layer-interactive)]"
        aria-label="Account"
        aria-expanded={open}
      >
        <span className="grid size-7 place-items-center rounded-full bg-[var(--layer-active)] text-[10.5px] font-semibold text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--line-strong)]">
          {initials || "?"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-[var(--text-quaternary)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="animate-in-up absolute right-0 top-11 w-64 overflow-hidden rounded-[var(--r-lg)] bg-[var(--layer-floating)] shadow-[var(--shadow-xl)]">
          <div className="border-b border-[var(--line-subtle)] px-4 py-3">
            <p className="truncate text-[13px] font-semibold">{fullName}</p>
            <p className="truncate text-[11px] text-[var(--text-quaternary)]">{email}</p>
            <div className="mt-2">
              <Chip tone="nav">{ROLE_LABEL[role] ?? role}</Chip>
            </div>
          </div>

          <div className="px-4 py-3 text-[11px] text-[var(--text-quaternary)]">
            <div className="flex items-center justify-between py-0.5">
              <span>Search</span>
              <kbd className="kbd">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Create</span>
              <kbd className="kbd">C</kbd>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 border-t border-[var(--line-subtle)] px-4 py-3 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--layer-interactive)] hover:text-[var(--critical-bright)]"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
