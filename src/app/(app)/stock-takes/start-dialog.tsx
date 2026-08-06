"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Tabs, TabsList, TabsTrigger } from "@/components/ui/misc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Site } from "@/lib/session";

type Category = { id: string; code: string; name: string; parent_id: string | null };
type Scope = "full" | "category" | "bin_range";

export function StartStockTakeDialog({
  sites,
  siteId,
  categories,
}: {
  sites: Site[];
  siteId: string | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState(siteId ?? sites[0]?.id ?? "");
  const [scope, setScope] = useState<Scope>("full");
  const [categoryId, setCategoryId] = useState("");
  const [binFrom, setBinFrom] = useState("");
  const [binTo, setBinTo] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!site) return toast.error("Choose which site you are counting.");
    if (scope === "category" && !categoryId)
      return toast.error("Pick the category to count.");
    if (scope === "bin_range" && (!binFrom.trim() || !binTo.trim()))
      return toast.error("Enter both ends of the bin range.");

    setBusy(true);
    const { data, error } = await createClient().rpc("start_stock_take", {
      p_site_id: site,
      p_scope: scope,
      p_category_id: scope === "category" ? categoryId : undefined,
      p_bin_from: scope === "bin_range" ? binFrom.trim() : undefined,
      p_bin_to: scope === "bin_range" ? binTo.trim() : undefined,
      p_notes: notes.trim() || undefined,
    });
    setBusy(false);

    if (error) return toast.error(friendlyError(error));

    toast.success(
      `${data?.reference ?? "Stock take"} started — expected quantities snapshotted.`,
    );
    setOpen(false);
    if (data?.id) router.push(`/stock-takes/${data.id}`);
    else router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardList /> Start count
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a stock take</DialogTitle>
          <DialogDescription>
            Expected quantities are captured now, so the variance reflects what
            the system believed when counting began.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <TabsList className="w-full">
                <TabsTrigger value="full" className="flex-1">
                  Full
                </TabsTrigger>
                <TabsTrigger value="category" className="flex-1">
                  Category
                </TabsTrigger>
                <TabsTrigger value="bin_range" className="flex-1">
                  Bin range
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {scope === "category" ? (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parent_id ? "— " : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scope === "bin_range" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bin-from">From bin</Label>
                <Input
                  id="bin-from"
                  value={binFrom}
                  onChange={(e) => setBinFrom(e.target.value)}
                  placeholder="A01-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bin-to">To bin</Label>
                <Input
                  id="bin-to"
                  value={binTo}
                  onChange={(e) => setBinTo(e.target.value)}
                  placeholder="A04-99"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="take-notes">Notes</Label>
            <Input
              id="take-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Monthly cycle count, year end…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Start counting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
