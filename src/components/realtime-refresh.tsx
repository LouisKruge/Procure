"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the current screen live. When anyone else on the floor posts a
 * movement or changes a stock level, this refreshes the server components
 * so quantities update without a manual reload.
 *
 * Refreshes are coalesced - during a busy receiving session the same table
 * can fire dozens of events a second and re-rendering on each one would
 * make the tablet crawl.
 */
export function RealtimeRefresh({
  tables = ["stock_levels", "stock_movements"],
}: {
  tables?: string[];
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase.channel(`nexus-${tables.join("-")}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tables.join(",")]);

  return null;
}
