import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";

import { DispatchForm } from "./dispatch-form";

export const dynamic = "force-dynamic";

export default async function NewDispatchPage() {
  const session = await getSession();

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
        title="New dispatch"
        description="Scan or search items, then issue. Stock comes off immediately."
      />

      <DispatchForm
        sites={session.sites}
        siteId={session.siteId}
        userName={session.fullName}
      />
    </>
  );
}
