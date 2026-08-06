import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDateTime, formatQty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge, PageHeader } from "@/components/shared";

import { ReceiveTransferForm } from "./receive-form";

export const dynamic = "force-dynamic";

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const supabase = await createClient();

  const { data: transfer } = await supabase
    .from("transfers")
    .select(
      "*, from_site:sites!transfers_from_site_id_fkey(code, name), to_site:sites!transfers_to_site_id_fkey(code, name), sender:profiles!transfers_sent_by_fkey(full_name), receiver:profiles!transfers_received_by_fkey(full_name), lines:transfer_lines(id, qty_sent, qty_received, item:stock_items(id, sku, description, uom))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!transfer) notFound();

  const from = transfer.from_site as { code?: string; name?: string } | null;
  const to = transfer.to_site as { code?: string; name?: string } | null;
  const sender = transfer.sender as { full_name?: string } | null;
  const receiver = transfer.receiver as { full_name?: string } | null;

  const lines = (transfer.lines ?? []) as {
    id: string;
    qty_sent: number;
    qty_received: number;
    item: { id: string; sku: string; description: string; uom: string };
  }[];

  // Only someone who can act on the destination site may book it in.
  const canReceive =
    transfer.status === "in_transit" &&
    (session.isManager ||
      session.sites.some((s) => s.id === transfer.to_site_id));

  const shortfall = lines.reduce(
    (s, l) => s + (Number(l.qty_sent) - Number(l.qty_received)),
    0,
  );

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/transfers">
            <ArrowLeft /> Transfers
          </Link>
        </Button>
      </div>

      <PageHeader
        title={transfer.transfer_number}
        description={`${from?.code} → ${to?.code}`}
        action={<DocStatusBadge status={transfer.status} />}
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
            <p className="font-semibold">
              {from?.code} — {from?.name}
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
            <p className="font-semibold">
              {to?.code} — {to?.name}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta
            label="Sent"
            value={transfer.sent_at ? formatDateTime(transfer.sent_at) : "Not sent"}
          />
          <Meta label="Sent by" value={sender?.full_name || "—"} />
          <Meta
            label="Received"
            value={
              transfer.received_at ? formatDateTime(transfer.received_at) : "Not received"
            }
          />
          <Meta label="Received by" value={receiver?.full_name || "—"} />
        </div>

        {transfer.notes ? (
          <p className="mt-3 text-sm text-muted-foreground">{transfer.notes}</p>
        ) : null}
      </Card>

      {canReceive ? (
        <ReceiveTransferForm
          transferId={transfer.id}
          transferNumber={transfer.transfer_number}
          lines={lines.map((l) => ({
            line_id: l.id,
            sku: l.item.sku,
            description: l.item.description,
            uom: l.item.uom,
            qty_sent: Number(l.qty_sent),
          }))}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {lines.map((line) => {
              const short =
                transfer.status === "received" &&
                Number(line.qty_received) < Number(line.qty_sent);
              return (
                <Link
                  key={line.id}
                  href={`/stock/${line.item.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.item.sku}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {line.item.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular font-semibold">
                      {formatQty(line.qty_sent)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {line.item.uom} sent
                      </span>
                    </p>
                    {transfer.status === "received" ? (
                      <p
                        className={`text-xs ${short ? "text-out" : "text-muted-foreground"}`}
                      >
                        {formatQty(line.qty_received)} received
                        {short ? " — short" : ""}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {transfer.status === "received" && shortfall > 0 ? (
        <p className="mt-3 rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          {formatQty(shortfall)} units were sent but never booked in. The
          difference is visible on both sites&apos; movement history.
        </p>
      ) : null}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
