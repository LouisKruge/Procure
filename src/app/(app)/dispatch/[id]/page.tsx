import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatDateTime, formatMoney, formatQty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge, PageHeader, QtyWithUom } from "@/components/shared";

import { IssueDraftButton } from "./issue-button";

export const dynamic = "force-dynamic";

export default async function DispatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSession();
  const supabase = await createClient();

  const { data: dispatch } = await supabase
    .from("dispatches")
    .select(
      "*, site:sites(code, name), issuer:profiles!dispatches_issued_by_fkey(full_name), lines:dispatch_lines(id, qty, unit_cost, item:stock_items(id, sku, description, uom))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!dispatch) notFound();

  const site = dispatch.site as { code?: string; name?: string } | null;
  const issuer = dispatch.issuer as { full_name?: string } | null;
  const lines = (dispatch.lines ?? []) as {
    id: string;
    qty: number;
    unit_cost: number;
    item: { id: string; sku: string; description: string; uom: string };
  }[];

  const totalUnits = lines.reduce((s, l) => s + Number(l.qty), 0);
  const totalValue = lines.reduce(
    (s, l) => s + Number(l.qty) * Number(l.unit_cost),
    0,
  );

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dispatch">
            <ArrowLeft /> Dispatch
          </Link>
        </Button>
      </div>

      <PageHeader
        title={dispatch.dispatch_number}
        description={`${site?.code} — ${site?.name}`}
        action={
          <div className="flex items-center gap-2">
            <DocStatusBadge status={dispatch.status} />
            {dispatch.status === "draft" ? (
              <IssueDraftButton dispatchId={dispatch.id} />
            ) : null}
          </div>
        }
      />

      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Meta label="Job reference" value={dispatch.job_reference || "—"} />
        <Meta label="Cost centre" value={dispatch.cost_center || "—"} />
        <Meta label="Customer" value={dispatch.customer || "—"} />
        <Meta label="Authorised by" value={dispatch.authorized_by || "—"} />
        <Meta
          label="Issued"
          value={dispatch.issued_at ? formatDateTime(dispatch.issued_at) : "Not issued"}
        />
        <Meta label="Issued by" value={issuer?.full_name || "—"} />
        <Meta label="Units" value={formatQty(totalUnits)} />
        <Meta label="Value" value={formatMoney(totalValue)} />
      </Card>

      {dispatch.notes ? (
        <Card className="mb-4 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="mt-1">{dispatch.notes}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="divide-y">
          {lines.map((line) => (
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
                <QtyWithUom qty={line.qty} uom={line.item.uom} />
                <p className="text-xs text-muted-foreground">
                  {formatMoney(Number(line.qty) * Number(line.unit_cost))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
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
