"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  LineChart,
  MoreHorizontal,
  PackagePlus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/stock", label: "Stock lookup", icon: Search, primary: true },
  { href: "/receiving", label: "Receiving", icon: PackagePlus, primary: true },
  { href: "/dispatch", label: "Dispatch", icon: Truck, primary: true },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/stock-takes", label: "Stock takes", icon: ClipboardCheck },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/minimums", label: "Minimum qty", icon: SlidersHorizontal },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/labels", label: "Bin labels", icon: Tags },
  { href: "/import", label: "Import stock", icon: Upload },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Persistent sidebar, desktop only. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-card p-3 lg:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Icon className="size-5 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Mobile navigation. Four highest-traffic destinations sit in the thumb
 * zone; everything else lives behind "More" rather than being crammed in.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => "primary" in i && i.primary);
  const rest = NAV_ITEMS.filter((i) => !("primary" in i && i.primary));
  const restActive = rest.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-medium",
              isActive(pathname, href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-6" />
            {label.split(" ")[0]}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-medium",
            restActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="size-6" />
          More
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Go to</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            {rest.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium",
                  isActive(pathname, href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
