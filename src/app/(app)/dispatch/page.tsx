import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatQty, relativeDays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const session = await getSession();
  const supabase = await createClient();

  let query = supabase
    .from("dispatches")
    .select(
      "id, dispatch_number, status, job_reference, cost_center, customer, issued_at, created_at, site:sites(code), lines:dispatch_lines(qty)",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (session.siteId) query = query.eq("site_id", session.siteId);

  const { data } = await query;
  const dispatches = data ?? [];
  const drafts = dispatches.filter((d) => d.status === "draft");
  const issued = dispatches.filter((d) => d.status !== "draft");

  return (
    <>
      <RealtimeRefresh tables={["dispatches", "stock_movements"]} />

      <PageHeader
        title="Dispatch"
        description="Issue stock out to a job, cost centre or customer."
        action={
          <Button asChild>
            <Link href="/dispatch/new">
              <Plus /> New dispatch
            </Link>
          </Button>
        }
      />

      {dispatches.length === 0 ? (
        <EmptyState
          icon={<Truck />}
          title="Nothing dispatched yet"
          description="Every issue out of stock is recorded here with who authorised it."
          action={
            <Button asChild>
              <Link href="/dispatch/new">Create the first dispatch</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {drafts.length > 0 ? (
            <SectionCard title={`${drafts.length} draft — not yet issued`}>
              {drafts.map((d) => (
                <ListRow
                  key={d.id}
                  href={`/dispatch/${d.id}`}
                  tone="low"
                  title={`${d.dispatch_number} — ${d.job_reference || d.customer || "No reference"}`}
                  subtitle={`${(d.site as { code?: string } | null)?.code} · created ${relativeDays(d.created_at)}`}
                  right={<DocStatusBadge status={d.status} />}
                  rightSub={`${formatQty(
                    (d.lines as { qty: number }[]).reduce(
                      (s, l) => s + Number(l.qty),
                      0,
                    ),
                  )} units`}
                />
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title="Issued" empty={issued.length === 0}>
            {issued.map((d) => (
              <ListRow
                key={d.id}
                href={`/dispatch/${d.id}`}
                title={`${d.dispatch_number} — ${d.job_reference || d.customer || "No reference"}`}
                subtitle={`${(d.site as { code?: string } | null)?.code} · ${
                  d.cost_center ? `${d.cost_center} · ` : ""
                }issued ${relativeDays(d.issued_at)}`}
                right={<DocStatusBadge status={d.status} />}
                rightSub={`${formatQty(
                  (d.lines as { qty: number }[]).reduce((s, l) => s + Number(l.qty), 0),
                )} units`}
              />
            ))}
          </SectionCard>
        </div>
      )}
    </>
  );
}
