"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  ClipboardCheck,
  LogOut,
  PackagePlus,
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

/* Quick create targets. Shift+key from anywhere. */
const CREATE_ACTIONS = [
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
  alerts: { critical: number; attention: number; approvals: number };
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

  const totalAlerts = alerts.critical + alerts.approvals;

  return (
    <div className="relative z-10 flex min-h-dvh">
      <Sidebar
        siteName={siteName}
        siteCode={siteCode}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickCreate={() => setCreateOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar ------------------------------------------------------ */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--line-subtle)] px-3 sm:px-5">
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid size-7 place-items-center rounded-[var(--r-md)] bg-gradient-to-br from-[var(--nav)] to-[var(--nav-dim)]">
              <span className="text-[11px] font-bold text-white">N</span>
            </span>
          </Link>

          {/* Live status ------------------------------------------------ */}
          <div className="hidden items-center gap-2 md:flex">
            <Chip tone={alerts.critical > 0 ? "critical" : "success"} dot>
              {alerts.critical > 0 ? `${alerts.critical} critical` : "All clear"}
            </Chip>
            {alerts.attention > 0 ? (
              <Chip tone="attention">{alerts.attention} low</Chip>
            ) : null}
            {alerts.approvals > 0 ? (
              <Chip tone="pending">{alerts.approvals} to approve</Chip>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SiteSwitcher sites={sites} siteId={siteId} allowAll={allowAll} />

            <button
              type="button"
              onClick={() => router.push("/procurement")}
              className="relative grid size-9 place-items-center rounded-[var(--r-md)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--layer-interactive)] hover:text-[var(--text-primary)]"
              aria-label={`Notifications${totalAlerts ? `, ${totalAlerts} needing attention` : ""}`}
            >
              <Bell className="size-[18px]" />
              {totalAlerts > 0 ? (
                <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--critical)] px-1 text-[9px] font-bold text-white">
                  {totalAlerts > 99 ? "99+" : totalAlerts}
                </span>
              ) : null}
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
        className={cn(
          "grid size-9 place-items-center rounded-full bg-gradient-to-br from-[var(--layer-active)] to-[var(--layer-interactive)]",
          "text-[11px] font-bold text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-transform active:scale-95",
        )}
        aria-label="Account"
        aria-expanded={open}
      >
        {initials || "?"}
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
