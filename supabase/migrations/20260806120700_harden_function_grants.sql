-- NEXUS Stock :: 08 hardening
--
-- Postgres grants EXECUTE to PUBLIC on every new function, which on
-- Supabase means the `anon` role can reach them over /rest/v1/rpc before
-- signing in. The functions all perform their own authorisation checks, but
-- there is no reason to expose them to an unauthenticated caller at all, so
-- EXECUTE is revoked from PUBLIC and re-granted only to `authenticated`.

do $$
declare
  v_sig text;
begin
  for v_sig in
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon', v_sig);
  end loop;

  for v_sig in
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname not in ('handle_new_user', 'touch_updated_at')
  loop
    execute format('grant execute on function %s to authenticated', v_sig);
  end loop;
end $$;

-- Trigger functions run as the table owner and are never called directly,
-- so they stay ungranted. touch_updated_at also needs a pinned search_path.
alter function public.touch_updated_at() set search_path = public;
