"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Checkbox,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemPicker, type PickedItem } from "@/components/item-picker";
import { LABELS_PER_SHEET } from "@/lib/labels";
import type { Site } from "@/lib/session";

type Category = { id: string; name: string; parent_id: string | null };
type Preselected = {
  id: string;
  sku: string;
  description: string;
  default_bin: string | null;
} | null;

type Chosen = { id: string; sku: string; description: string; bin: string | null };

const ALL = "__all__";
const DEFAULT_BINS = "__default__";

export function LabelBuilder({
  sites,
  siteId,
  categories,
  preselected,
}: {
  sites: Site[];
  siteId: string | null;
  categories: Category[];
  preselected: Preselected;
}) {
  const [mode, setMode] = useState(preselected ? "picked" : "bulk");
  const [chosen, setChosen] = useState<Chosen[]>(
    preselected
      ? [
          {
            id: preselected.id,
            sku: preselected.sku,
            description: preselected.description,
            bin: preselected.default_bin,
          },
        ]
      : [],
  );

  const [site, setSite] = useState(siteId ?? DEFAULT_BINS);
  const [category, setCategory] = useState(ALL);
  const [binFrom, setBinFrom] = useState("");
  const [binTo, setBinTo] = useState("");
  const [showBarcode, setShowBarcode] = useState(true);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [startPosition, setStartPosition] = useState("1");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs for the preview leak if they are not released.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function addItem(item: PickedItem) {
    if (chosen.some((c) => c.id === item.id)) {
      toast.info(`${item.sku} is already in the list.`);
      return;
    }
    setChosen((c) => [
      ...c,
      { id: item.id, sku: item.sku, description: item.description, bin: null },
    ]);
  }

  async function generate() {
    setBusy(true);

    const body = {
      itemIds: mode === "picked" ? chosen.map((c) => c.id) : undefined,
      siteId: site === DEFAULT_BINS ? null : site,
      categoryId: mode === "bulk" && category !== ALL ? category : null,
      binFrom: mode === "bulk" && binFrom.trim() ? binFrom.trim() : null,
      binTo: mode === "bulk" && binTo.trim() ? binTo.trim() : null,
      showBarcode,
      showCropMarks,
      startPosition: Math.max(0, (Number(startPosition) || 1) - 1),
    };

    if (mode === "picked" && chosen.length === 0) {
      setBusy(false);
      return toast.error("Add at least one item to print.");
    }

    const response = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setBusy(false);

    if (!response.ok) {
      if (response.status === 401) {
        return toast.error("Your session has expired. Sign in again.");
      }
      const error = await response.json().catch(() => ({}));
      return toast.error(error.error ?? "The labels could not be generated.");
    }

    const blob = await response.blob();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    window.open(url, "_blank");
    toast.success("Labels generated — check the new tab to print.");
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="bulk" className="flex-1">
            By category or bin range
          </TabsTrigger>
          <TabsTrigger value="picked" className="flex-1">
            Pick items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <Card className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Every category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parent_id ? "— " : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lbl-from">Bin from</Label>
                <Input
                  id="lbl-from"
                  value={binFrom}
                  onChange={(e) => setBinFrom(e.target.value)}
                  placeholder="A01-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lbl-to">Bin to</Label>
                <Input
                  id="lbl-to"
                  value={binTo}
                  onChange={(e) => setBinTo(e.target.value)}
                  placeholder="A99-99"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="picked">
          <Card className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>Add items</Label>
              <ItemPicker onPick={addItem} placeholder="Scan or search to add…" />
            </div>

            {chosen.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {chosen.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.sku}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${c.sku}`}
                      onClick={() => setChosen((l) => l.filter((x) => x.id !== c.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing added yet — every item you add gets one label.
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Bin locations from</Label>
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_BINS}>Item default bin</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choosing a site uses that site&apos;s own bin for each item.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="start">Start at label position (1–{LABELS_PER_SHEET})</Label>
          <Input
            id="start"
            type="number"
            min={1}
            max={LABELS_PER_SHEET}
            value={startPosition}
            onChange={(e) => setStartPosition(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Skip positions already used on a part-printed sheet.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={showBarcode}
            onCheckedChange={(v) => setShowBarcode(Boolean(v))}
          />
          <span className="text-sm font-medium">
            Print Code 128 barcode
            <span className="block text-xs font-normal text-muted-foreground">
              Uses the item barcode, or the stock code when none is set
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={showCropMarks}
            onCheckedChange={(v) => setShowCropMarks(Boolean(v))}
          />
          <span className="text-sm font-medium">
            Print crop marks
            <span className="block text-xs font-normal text-muted-foreground">
              Corner ticks for guillotine cutting
            </span>
          </span>
        </label>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            {mode === "picked"
              ? `${chosen.length} label${chosen.length === 1 ? "" : "s"}`
              : "All matching items"}
          </p>
          <Badge variant="secondary" className="mt-1">
            {LABELS_PER_SHEET} per A4 sheet · 88 × 38 mm
          </Badge>
        </div>
        <Button size="lg" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Printer />}
          Generate PDF
        </Button>
      </Card>

      {previewUrl ? (
        <Card className="overflow-hidden">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">Preview</p>
          </div>
          <object
            data={previewUrl}
            type="application/pdf"
            className="h-[70dvh] w-full"
            aria-label="Bin label preview"
          >
            <p className="p-4 text-sm text-muted-foreground">
              Your browser cannot display the PDF inline — it opened in a new tab.
            </p>
          </object>
        </Card>
      ) : null}
    </div>
  );
}
