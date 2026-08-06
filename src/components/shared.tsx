import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatQty } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Dashboard tile. `tone` drives the accent so the eye lands on the red
 * numbers first without having to read the labels.
 */
export function StatTile({
  label,
  value,
  sub,
  href,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone?: "neutral" | "ok" | "low" | "out" | "transit";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    neutral: "text-foreground",
    ok: "text-ok",
    low: "text-low",
    out: "text-out",
    transit: "text-transit",
  }[tone];

  const body = (
    <Card
      className={cn(
        "h-full p-4 transition-colors",
        href ? "hover:border-primary/50 hover:bg-accent/40" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? <span className={cn("[&_svg]:size-4", toneClass)}>{icon}</span> : null}
      </div>
      <p className={cn("tabular mt-1.5 text-2xl font-bold sm:text-3xl", toneClass)}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function StockStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  if (status === "out")
    return (
      <Badge variant="out" className={className}>
        Out of stock
      </Badge>
    );
  if (status === "low")
    return (
      <Badge variant="low" className={className}>
        Below reorder
      </Badge>
    );
  return (
    <Badge variant="ok" className={className}>
      In stock
    </Badge>
  );
}

const DOC_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "ok" | "low" | "out" | "transit" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default" },
  partially_received: { label: "Part received", variant: "low" },
  received: { label: "Received", variant: "ok" },
  closed: { label: "Closed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  issued: { label: "Issued", variant: "ok" },
  in_transit: { label: "In transit", variant: "transit" },
  counting: { label: "Counting", variant: "low" },
  pending_approval: { label: "Awaiting approval", variant: "low" },
  approved: { label: "Approved", variant: "ok" },
};

export function DocStatusBadge({ status }: { status: string }) {
  const s = DOC_STATUS[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/** Row used by the dashboard action lists and most list screens. */
export function ListRow({
  href,
  title,
  subtitle,
  right,
  rightSub,
  tone,
}: {
  href: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  rightSub?: string;
  tone?: "out" | "low" | "transit";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/50",
        tone === "out" ? "border-l-4 border-l-out" : "",
        tone === "low" ? "border-l-4 border-l-low" : "",
        tone === "transit" ? "border-l-4 border-l-transit" : "",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {right}
        {rightSub ? (
          <p className="text-xs text-muted-foreground">{rightSub}</p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function QtyWithUom({
  qty,
  uom,
  className,
}: {
  qty: number | string | null;
  uom?: string | null;
  className?: string;
}) {
  return (
    <span className={cn("tabular font-semibold", className)}>
      {formatQty(qty)}
      {uom ? (
        <span className="ml-1 text-xs font-normal text-muted-foreground">{uom}</span>
      ) : null}
    </span>
  );
}

export function SectionCard({
  title,
  action,
  children,
  empty,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {empty ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing here right now.
        </p>
      ) : (
        children
      )}
    </Card>
  );
}
