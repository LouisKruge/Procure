import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/shared";

import { Counter } from "./counter";

export const dynamic = "force-dynamic";

export default async function CounterPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        title="Stock counter"
        description="Find a part by code, description or bin, put in a quantity, and book it out or back in."
      />

      <Counter sites={session.sites} siteId={session.siteId} />
    </>
  );
}
