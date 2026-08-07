import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type Alerts } from "@/components/shell/app-shell";

/**
 * Counts for the live status strip in the top bar.
 *
 * Deliberately not awaited here. These are three counts over a view that
 * joins every stock line, and the shell has no reason to wait for them -
 * the sidebar, the top bar and the page underneath can all paint while the
 * numbers are still in flight. The promise is handed to the shell and
 * unwrapped inside a Suspense boundary.
 */
function loadAlerts(siteId: string | null): Promise<Alerts> {
  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
    siteId ? q.eq("site_id", siteId) : q;

  return createClient()
    .then((supabase) =>
      Promise.all([
        scope(
          supabase
            .from("v_stock_status")
            .select("*", { count: "exact", head: true })
            .eq("stock_status", "out"),
        ),
        scope(
          supabase
            .from("v_stock_status")
            .select("*", { count: "exact", head: true })
            .eq("stock_status", "low"),
        ),
        scope(
          supabase
            .from("v_stock_take_summary")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_approval"),
        ),
      ]),
    )
    .then(([critical, attention, approvals]) => ({
      critical: critical.count ?? 0,
      attention: attention.count ?? 0,
      approvals: approvals.count ?? 0,
    }))
    // A status strip is not worth failing a page over.
    .catch(() => ({ critical: 0, attention: 0, approvals: 0 }));
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <AppShell
      fullName={session.fullName}
      email={session.email}
      role={session.role}
      sites={session.sites}
      siteId={session.siteId}
      siteName={session.site?.name ?? "All sites"}
      siteCode={session.site?.code ?? "ALL"}
      allowAll={session.isManager || session.sites.length > 1}
      alerts={loadAlerts(session.siteId)}
    >
      {children}
    </AppShell>
  );
}
