import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/shared";

import { AnalyticsBoard } from "./analytics-board";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        title="Analytics"
        description="What moves, what sits, and how much you get through."
      />
      <AnalyticsBoard siteId={session.siteId} />
    </>
  );
}
