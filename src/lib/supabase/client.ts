"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Browser-side Supabase client. Safe to call repeatedly - @supabase/ssr
 * memoises the underlying client per browser context.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
