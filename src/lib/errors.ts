/**
 * Turns whatever Postgres/PostgREST threw into something a person standing
 * at a receiving bay can act on. The database functions already raise
 * human-readable messages, so those are passed through untouched; this only
 * has to catch the raw driver-level failures.
 */

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "That already exists - check for a duplicate code or barcode.",
  "23503": "Something this record depends on is missing or has been deleted.",
  "23514": "Those values are not allowed - check the quantities you entered.",
  "42501": "You do not have permission to do that.",
  PGRST301: "Your session has expired. Sign in again.",
  PGRST116: "That record could not be found.",
  "22P02": "One of the values entered is not in the right format.",
};

export function friendlyError(error: unknown): string {
  if (!error) return "Something went wrong. Try again.";

  if (typeof error === "string") return error;

  const e = error as SupabaseLikeError;

  if (e.code && CODE_MESSAGES[e.code]) return CODE_MESSAGES[e.code];

  const message = e.message?.trim();
  if (!message) return "Something went wrong. Try again.";

  // Messages raised by our own plpgsql functions are already written for
  // people; anything with SQL noise in it is not.
  if (/^(duplicate key|null value|permission denied|relation |column )/i.test(message)) {
    return CODE_MESSAGES[e.code ?? ""] ?? "That could not be saved. Check the values and try again.";
  }

  if (/JWT|refresh token|not authenticated/i.test(message)) {
    return "Your session has expired. Sign in again.";
  }

  if (/fetch failed|network|Failed to fetch/i.test(message)) {
    return "Cannot reach the server. Check your connection - nothing was saved.";
  }

  return message;
}
