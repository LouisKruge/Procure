import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const supabase = await createClient();

  // Counts for the live status strip in the top bar. Head-only queries, so
  // this costs three cheap counts rather than pulling rows on every page.
  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
    session.siteId ? q.eq("site_id", session.siteId) : q;

  const [critical, attention, approvals] = await Promise.all([
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
  ]);

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
      alerts={{
        critical: critical.count ?? 0,
        attention: attention.count ?? 0,
        approvals: approvals.count ?? 0,
      }}
    >
      {children}
    </AppShell>
  );
}
