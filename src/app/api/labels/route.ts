import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateLabelPdf, type LabelItem } from "@/lib/labels";

/**
 * Builds a bin-label PDF from live item data.
 *
 * Selection is resolved server-side against the caller's own session, so
 * RLS decides which items and bins they can print - the request body only
 * says *what* to print, never *whose* data.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    itemIds?: string[];
    siteId?: string | null;
    categoryId?: string | null;
    binFrom?: string | null;
    binTo?: string | null;
    showBarcode?: boolean;
    showCropMarks?: boolean;
    startPosition?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }

  const { itemIds, siteId, categoryId, binFrom, binTo } = body;

  let items: LabelItem[] = [];

  if (siteId) {
    // Site-specific: use the bin recorded for that site, not the item default.
    let query = supabase
      .from("v_stock_status")
      .select("sku, description, bin_location, barcode, uom, site_code, item_id")
      .eq("site_id", siteId)
      .order("bin_location", { nullsFirst: false })
      .limit(2000);

    if (itemIds?.length) query = query.in("item_id", itemIds);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (binFrom) query = query.gte("bin_location", binFrom);
    if (binTo) query = query.lte("bin_location", binTo);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    items = (data ?? []).map((r) => ({
      sku: r.sku ?? "",
      description: r.description ?? "",
      bin: r.bin_location,
      barcode: r.barcode,
      uom: r.uom,
      siteCode: r.site_code,
    }));
  } else {
    let query = supabase
      .from("stock_items")
      .select("sku, description, default_bin, barcode, uom")
      .eq("is_active", true)
      .order("default_bin", { nullsFirst: false })
      .limit(2000);

    if (itemIds?.length) query = query.in("id", itemIds);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (binFrom) query = query.gte("default_bin", binFrom);
    if (binTo) query = query.lte("default_bin", binTo);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    items = (data ?? []).map((r) => ({
      sku: r.sku,
      description: r.description,
      bin: r.default_bin,
      barcode: r.barcode,
      uom: r.uom,
      siteCode: null,
    }));
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Nothing matched that selection, so there is nothing to print." },
      { status: 400 },
    );
  }

  const pdf = await generateLabelPdf(items, {
    showBarcode: body.showBarcode,
    showCropMarks: body.showCropMarks,
    startPosition: body.startPosition,
  });

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bin-labels-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
