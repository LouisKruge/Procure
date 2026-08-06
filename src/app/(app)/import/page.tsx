import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/shared";

import { StockImporter } from "./stock-importer";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await getSession();

  if (!session.isManager) {
    return (
      <>
        <PageHeader title="Import stock" />
        <p className="rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          Only a supervisor or admin can import stock.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Import stock"
        description="Load or refresh the stock list from your spreadsheet. Re-importing updates existing items rather than duplicating them."
      />
      <StockImporter sites={session.sites} siteId={session.siteId} />
    </>
  );
}
