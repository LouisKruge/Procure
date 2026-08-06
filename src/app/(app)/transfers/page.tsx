import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatQty, relativeDays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import {
  DocStatusBadge,
  ListRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const session = await getSession();
  const supabase = await createClient();

  // Both ends of a transfer matter, so this is filtered on either site
  // rather than the usual single site_id column.
  let query = supabase
    .from("transfers")
    .select(
      "id, transfer_number, status, sent_at, received_at, created_at, notes, from_site_id, to_site_id, from_site:sites!transfers_from_site_id_fkey(code, name), to_site:sites!transfers_to_site_id_fkey(code, name), lines:transfer_lines(qty_sent)",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (session.siteId) {
    query = query.or(
      `from_site_id.eq.${session.siteId},to_site_id.eq.${session.siteId}`,
    );
  }

  const { data } = await query;
  const transfers = data ?? [];

  const inTransit = transfers.filter((t) => t.status === "in_transit");
  const drafts = transfers.filter((t) => t.status === "draft");
  const done = transfers.filter(
    (t) => t.status === "received" || t.status === "cancelled",
  );

  const units = (t: (typeof transfers)[number]) =>
    formatQty(
      (t.lines as { qty_sent: number }[]).reduce((s, l) => s + Number(l.qty_sent), 0),
    );

  const route = (t: (typeof transfers)[number]) => {
    const from = t.from_site as { code?: string } | null;
    const to = t.to_site as { code?: string } | null;
    return `${from?.code} → ${to?.code}`;
  };

  return (
    <>
      <RealtimeRefresh tables={["transfers", "stock_movements"]} />

      <PageHeader
        title="Transfers"
        description="Stock leaves the sending site immediately and shows as in transit until it is booked in."
        action={
          <Button asChild>
            <Link href="/transfers/new">
              <Plus /> New transfer
            </Link>
          </Button>
        }
      />

      {transfers.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight />}
          title="No transfers yet"
          description="Move stock between sites without it disappearing in the middle."
          action={
            <Button asChild>
              <Link href="/transfers/new">Create a transfer</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {inTransit.length > 0 ? (
            <SectionCard title={`${inTransit.length} in transit`}>
              {inTransit.map((t) => {
                const arriving =
                  !session.siteId || t.to_site_id === session.siteId;
                return (
                  <ListRow
                    key={t.id}
                    href={`/transfers/${t.id}`}
                    tone="transit"
                    title={`${t.transfer_number} — ${route(t)}`}
                    subtitle={`Sent ${relativeDays(t.sent_at)} · ${units(t)} units`}
                    right={
                      arriving ? (
                        <Badge variant="transit">Receive</Badge>
                      ) : (
                        <DocStatusBadge status={t.status} />
                      )
                    }
                  />
                );
              })}
            </SectionCard>
          ) : null}

          {drafts.length > 0 ? (
            <SectionCard title={`${drafts.length} draft — not yet sent`}>
              {drafts.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/transfers/${t.id}`}
                  tone="low"
                  title={`${t.transfer_number} — ${route(t)}`}
                  subtitle={`Created ${relativeDays(t.created_at)} · ${units(t)} units`}
                  right={<DocStatusBadge status={t.status} />}
                />
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title="Completed" empty={done.length === 0}>
            {done.map((t) => (
              <ListRow
                key={t.id}
                href={`/transfers/${t.id}`}
                title={`${t.transfer_number} — ${route(t)}`}
                subtitle={`Received ${relativeDays(t.received_at)} · ${units(t)} units`}
                right={<DocStatusBadge status={t.status} />}
              />
            ))}
          </SectionCard>
        </div>
      )}
    </>
  );
}
