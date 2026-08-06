import Link from "next/link";
import { Boxes } from "lucide-react";

import { getSession } from "@/lib/session";
import { BottomNav, Sidebar } from "@/components/app-nav";
import { SiteSwitcher } from "@/components/site-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="size-5" />
            </span>
            <span className="hidden text-base font-bold tracking-tight sm:inline">
              NEXUS Stock
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <SiteSwitcher
              sites={session.sites}
              siteId={session.siteId}
              allowAll={session.isManager || session.sites.length > 1}
            />
            <ThemeToggle />
            <UserMenu
              fullName={session.fullName}
              email={session.email}
              role={session.role}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar />
        {/* Bottom padding keeps the last row clear of the mobile nav bar. */}
        <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-5 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
      <CommandPalette />
    </div>
  );
}
