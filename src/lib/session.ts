import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type Site = Database["public"]["Tables"]["sites"]["Row"];

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  isManager: boolean;
  isAdmin: boolean;
  /** Sites this user may act on, already filtered by RLS. */
  sites: Site[];
  /** Currently selected site, or null when viewing all sites. */
  siteId: string | null;
  site: Site | null;
};

export const SITE_COOKIE = "nexus_site";

/**
 * Loads the signed-in user, their role and the sites they can reach.
 * Redirects to /login if there is no session - every page under (app)
 * calls this, so an expired session never renders a half-empty screen.
 *
 * Wrapped in cache(): the (app) layout and the page inside it both need the
 * session, and they render in the same pass. Without this every navigation
 * paid for two auth round trips and two profile lookups to learn the same
 * thing twice - which, at the distance between the browser, the function
 * and the database, is most of a second of doing nothing.
 */
export const getSession = cache(async function getSession(): Promise<Session> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: sites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, home_site_id")
      .eq("id", user.id)
      .single(),
    supabase.from("sites").select("*").eq("is_active", true).order("code"),
  ]);

  const role: Role = profile?.role ?? "staff";
  const isManager = role === "admin" || role === "site_supervisor";

  // Staff see only their own sites. RLS enforces this on every stock query
  // regardless; this narrows the site picker to match.
  let visibleSites = sites ?? [];
  if (!isManager) {
    const { data: extra } = await supabase
      .from("user_sites")
      .select("site_id")
      .eq("user_id", user.id);

    const allowed = new Set(
      [profile?.home_site_id, ...(extra ?? []).map((r) => r.site_id)].filter(
        Boolean,
      ) as string[],
    );
    visibleSites = visibleSites.filter((s) => allowed.has(s.id));
  }

  const cookieStore = await cookies();
  const cookieSite = cookieStore.get(SITE_COOKIE)?.value;

  const siteId =
    cookieSite && cookieSite !== "all" && visibleSites.some((s) => s.id === cookieSite)
      ? cookieSite
      : // Staff default to their own site; managers default to all sites.
        !isManager
        ? (visibleSites[0]?.id ?? null)
        : null;

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email?.split("@")[0] ?? "User",
    role,
    isManager,
    isAdmin: role === "admin",
    sites: visibleSites,
    siteId,
    site: visibleSites.find((s) => s.id === siteId) ?? null,
  };
});
