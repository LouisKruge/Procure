"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  site_supervisor: "Site supervisor",
  staff: "Stores staff",
};

export function UserMenu({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string;
}) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <User />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{fullName}</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>

        <div>
          <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Press <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> anywhere
          to search stock or jump between screens.
        </p>

        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut /> Sign out
        </Button>
      </DialogContent>
    </Dialog>
  );
}
