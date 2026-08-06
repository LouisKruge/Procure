import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/shared";

import { LabelBuilder } from "./label-builder";

export const dynamic = "force-dynamic";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const { item } = await searchParams;
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: categories }, { data: preselected }] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id").order("sort_order"),
    item
      ? supabase
          .from("stock_items")
          .select("id, sku, description, default_bin")
          .eq("id", item)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader
        title="Bin labels"
        description="38 × 88 mm linbin labels, 14 to an A4 sheet with crop marks."
      />

      <LabelBuilder
        sites={session.sites}
        siteId={session.siteId}
        categories={categories ?? []}
        preselected={preselected ?? null}
      />
    </>
  );
}
