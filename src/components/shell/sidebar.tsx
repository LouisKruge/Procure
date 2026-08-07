"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronsLeft,
  ClipboardCheck,
  Clock,
  FileBarChart,
  LayoutDashboard,
  LineChart,
  Package,
  PackagePlus,
  Pin,
  PinOff,
  Plus,
  Scale,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/data-display";

/* ==========================================================================
 * Navigation.
 *
 * Grouped by what someone is actually doing, not by database table. The
 * order is the order of a shift: see the day, find a part, book it in, book
 * it out, then the control and analysis work that happens between jobs.
 * ========================================================================== */

export type NavEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  shortcut?: string;
  group: string;
  primary?: boolean;
};

export const NAV_ITEMS: NavEntry[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Floor", primary: true },
  { href: "/counter", label: "Counter", icon: Scale, shortcut: "B", group: "Floor", primary: true },
  { href: "/stock", label: "Stock", icon: Package, shortcut: "S", group: "Floor", primary: true },
  { href: "/receiving", label: "Receiving", icon: PackagePlus, shortcut: "R", group: "Floor", primary: true },
  { href: "/dispatch", label: "Dispatch", icon: Truck, shortcut: "D", group: "Floor", primary: true },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, shortcut: "T", group: "Floor" },

  { href: "/procurement", label: "Procurement", icon: ShoppingCart, shortcut: "P", group: "Control" },
  { href: "/stock-takes", label: "Stock takes", icon: ClipboardCheck, group: "Control" },
  { href: "/minimums", label: "Minimum levels", icon: SlidersHorizontal, group: "Control" },

  { href: "/analytics", label: "Analytics", icon: LineChart, group: "Insight" },
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "Insight" },

  { href: "/labels", label: "Bin labels", icon: Tags, group: "Workshop" },
  { href: "/import", label: "Import", icon: Upload, group: "Workshop" },
];

const GROUPS = ["Floor", "Control", "Insight", "Workshop"] as const;

export function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

/* ------------------------------------------------------------- preferences
 * Collapse state, width and pins live in localStorage. They are a property
 * of this person at this workstation, not of the account.
 */

const KEY_COLLAPSED = "nexus.sidebar.collapsed";
const KEY_WIDTH = "nexus.sidebar.width";
const KEY_PINS = "nexus.sidebar.pins";
const KEY_RECENT = "nexus.sidebar.recent";

const MIN_W = 208;
const MAX_W = 340;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function Sidebar({
  siteName,
  siteCode,
  onOpenSearch,
  onQuickCreate,
}: {
  siteName: string;
  siteCode: string;
  onOpenSearch: () => void;
  onQuickCreate: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(248);
  const [pins, setPins] = React.useState<string[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [ready, setReady] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const draggingRef = React.useRef(false);

  // Read persisted state after mount so the server and first client render
  // agree, then reveal.
  React.useEffect(() => {
    // Deferred so the stored preferences land in their own render pass
    // rather than immediately re-rendering the shell during hydration.
    const t = setTimeout(() => {
      setCollapsed(readJson(KEY_COLLAPSED, false));
      setWidth(readJson(KEY_WIDTH, 248));
      setPins(readJson<string[]>(KEY_PINS, []));
      setRecent(readJson<string[]>(KEY_RECENT, []));
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Track visited screens for the Recent block.
  React.useEffect(() => {
    if (!ready) return;
    const entry = NAV_ITEMS.find((n) => isActive(pathname, n.href));
    if (!entry || entry.href === "/dashboard") return;

    const t = setTimeout(() => setRecent((prev) => {
      const next = [entry.href, ...prev.filter((h) => h !== entry.href)].slice(0, 4);
      window.localStorage.setItem(KEY_RECENT, JSON.stringify(next));
      return next;
    }), 0);
    return () => clearTimeout(t);
  }, [pathname, ready]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      window.localStorage.setItem(KEY_COLLAPSED, JSON.stringify(!c));
      return !c;
    });
  }

  function togglePin(href: string) {
    setPins((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      window.localStorage.setItem(KEY_PINS, JSON.stringify(next));
      return next;
    });
  }

  /* Drag-to-resize. Pointer events so it works with a stylus on the tablet. */
  React.useEffect(() => {
    function move(e: PointerEvent) {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, e.clientX));
      setWidth(next);
    }
    function up() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem(KEY_WIDTH, JSON.stringify(width));
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [width]);

  const pinned = NAV_ITEMS.filter((n) => pins.includes(n.href));
  const recentItems = recent
    .filter((h) => !pins.includes(h))
    .map((h) => NAV_ITEMS.find((n) => n.href === h))
    .filter(Boolean) as NavEntry[];

  return (
    <aside
      className="relative hidden shrink-0 flex-col border-r border-[var(--line)] bg-[var(--layer-chrome)] lg:flex"
      style={{
        width: collapsed ? 64 : width,
        transition: dragging ? "none" : "width var(--t-base) var(--ease-out)",
      }}
    >
      {/* Workspace ------------------------------------------------------- */}
      <div className="flex h-14 items-center gap-2.5 px-3">
        <div className="edge-lit grid size-8 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--layer-active)] ring-1 ring-inset ring-[var(--line-strong)]">
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-white">N</span>
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1 animate-in-up">
            <p className="truncate text-[13px] font-medium leading-tight tracking-[-0.01em]">Nexus</p>
            <p className="code truncate text-[10.5px] leading-tight text-[var(--text-quaternary)]">
              {siteCode} · {siteName}
            </p>
          </div>
        ) : null}
      </div>

      {/* Actions --------------------------------------------------------- */}
      <div className={cn("flex flex-col gap-1.5 px-3 pb-3", collapsed && "items-center px-2")}>
        <button
          type="button"
          onClick={onOpenSearch}
          className={cn(
            "group flex h-9 items-center gap-2 rounded-[var(--r-md)] bg-[var(--layer-sunken)] px-2.5 text-left",
            "ring-1 ring-inset ring-[var(--line)] transition-colors hover:bg-[var(--layer-surface)] hover:ring-[var(--line-strong)]",
            collapsed && "w-9 justify-center px-0",
          )}
          aria-label="Search"
        >
          <Search className="size-4 shrink-0 text-[var(--text-tertiary)]" />
          {!collapsed ? (
            <>
              <span className="flex-1 text-[13px] text-[var(--text-quaternary)]">Search…</span>
              <kbd className="kbd">⌘K</kbd>
            </>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onQuickCreate}
          className={cn(
            "flex h-9 items-center gap-2 rounded-[var(--r-md)] bg-white px-2.5 text-[13px] font-medium tracking-[-0.005em]",
            "text-[#0A0A0A] transition-[background-color,transform] duration-150 hover:bg-[oklch(0.93_0_0)] active:scale-[0.985]",
            collapsed && "w-9 justify-center px-0",
          )}
          aria-label="Quick create"
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed ? <span className="flex-1 text-left">Create</span> : null}
          {!collapsed ? <kbd className="kbd bg-black/10 text-black/55 shadow-none">C</kbd> : null}
        </button>
      </div>

      {/* Navigation ------------------------------------------------------ */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {pinned.length > 0 && !collapsed ? (
          <NavGroup label="Pinned">
            {pinned.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                pinned
                onTogglePin={togglePin}
              />
            ))}
          </NavGroup>
        ) : null}

        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group && !pins.includes(n.href));
          if (items.length === 0) return null;
          return (
            <NavGroup key={group} label={collapsed ? null : group}>
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={collapsed}
                  onTogglePin={togglePin}
                />
              ))}
            </NavGroup>
          );
        })}

        {recentItems.length > 0 && !collapsed ? (
          <NavGroup label="Recent" icon={<Clock className="size-3" />}>
            {recentItems.map((item) => (
              <NavLink
                key={`recent-${item.href}`}
                item={item}
                active={false}
                collapsed={collapsed}
                muted
                onTogglePin={togglePin}
              />
            ))}
          </NavGroup>
        ) : null}
      </nav>

      {/* Collapse -------------------------------------------------------- */}
      <div className={cn("px-3 pb-3", collapsed && "px-2")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-[var(--r-md)] px-2 text-[12px] text-[var(--text-quaternary)]",
            "transition-colors hover:bg-[var(--layer-interactive)] hover:text-[var(--text-secondary)]",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft
            className={cn("size-4 transition-transform var(--t-base)", collapsed && "rotate-180")}
          />
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>

      {/* Resize handle --------------------------------------------------- */}
      {!collapsed ? (
        <div
          onPointerDown={() => {
            draggingRef.current = true;
            setDragging(true);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="absolute inset-y-0 -right-1 w-2 cursor-col-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-[var(--line-strong)]" />
        </div>
      ) : null}
    </aside>
  );
}

function NavGroup({
  label,
  icon,
  children,
}: {
  label: string | null;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-2">
      {label ? (
        <div className="mb-2 flex items-center gap-1.5 px-3">
          {icon}
          <SectionLabel>{label}</SectionLabel>
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  muted,
  pinned,
  onTogglePin,
}: {
  item: NavEntry;
  active: boolean;
  collapsed: boolean;
  muted?: boolean;
  pinned?: boolean;
  onTogglePin: (href: string) => void;
}) {
  const Icon = item.icon;

  return (
    <div className="group/nav relative">
      <Link
        href={item.href}
        data-active={active}
        title={collapsed ? item.label : undefined}
        className={cn(
          "nav-item flex h-9 items-center gap-3 rounded-[var(--r-md)] pl-3 pr-2 text-[13px] tracking-[-0.005em]",
          collapsed && "justify-center px-0",
          active
            ? "bg-[var(--layer-elevated)] font-medium text-white [&_svg]:text-white"
            : muted
              ? "text-[var(--text-quaternary)] hover:bg-[var(--layer-interactive)] hover:text-[var(--text-secondary)]"
              : "text-[var(--text-tertiary)] hover:bg-[var(--layer-interactive)] hover:text-[var(--text-primary)]",
        )}
      >
        <Icon className="size-[17px] shrink-0 transition-colors duration-150" strokeWidth={1.6} />
        {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
        {!collapsed && item.shortcut && !active ? (
          <kbd className="kbd opacity-0 transition-opacity group-hover/nav:opacity-100">
            {item.shortcut}
          </kbd>
        ) : null}
      </Link>

      {!collapsed ? (
        <button
          type="button"
          onClick={() => onTogglePin(item.href)}
          aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--r-xs)] p-1",
            "text-[var(--text-quaternary)] opacity-0 transition-opacity hover:text-[var(--text-primary)]",
            "focus-visible:opacity-100 group-hover/nav:opacity-100",
            item.shortcut && !pinned ? "group-hover/nav:opacity-0" : "",
          )}
        >
          {pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
        </button>
      ) : null}
    </div>
  );
}

/** Mobile: the four highest-traffic destinations in the thumb zone. */
export function MobileBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((n) => n.primary);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--line)] bg-[var(--layer-chrome)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {primary.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-white" : "text-[var(--text-quaternary)]",
            )}
          >
            {active ? (
              <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-white" />
            ) : null}
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-[var(--text-quaternary)]"
      >
        <Search className="size-5" />
        Search
      </button>
    </nav>
  );
}
