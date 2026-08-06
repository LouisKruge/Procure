import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/shared";

import { MinimumsEditor } from "./minimums-editor";

export const dynamic = "force-dynamic";

export default async function MinimumsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("sort_order")
    .order("name");

  if (!session.isManager) {
    return (
      <>
        <PageHeader title="Minimum quantities" />
        <p className="rounded-lg bg-low-subtle px-4 py-3 text-sm text-low">
          Only a supervisor or admin can change minimum quantities.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Minimum quantities"
        description="The level an item has to drop to before it shows up in procurement."
      />
      <MinimumsEditor categories={categories ?? []} siteId={session.siteId} />
    </>
  );
}
