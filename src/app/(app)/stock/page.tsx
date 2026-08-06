import { PageHeader } from "@/components/shared";
import { getSession } from "@/lib/session";

import { StockSearch } from "./stock-search";

export const dynamic = "force-dynamic";

export default async function StockLookupPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        title="Stock lookup"
        description="Scan, or type any part of a code or description."
      />
      <StockSearch sites={session.sites} siteId={session.siteId} />
    </>
  );
}
