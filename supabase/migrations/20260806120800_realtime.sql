-- NEXUS Stock :: 09 realtime
--
-- Publish the tables the floor screens watch. Two people working the same
-- site need to see each other's receipts and issues without refreshing.
-- Realtime still applies RLS, so a staff member only receives events for
-- sites they can already read.

alter publication supabase_realtime add table public.stock_levels;
alter publication supabase_realtime add table public.stock_movements;
alter publication supabase_realtime add table public.purchase_orders;
alter publication supabase_realtime add table public.transfers;
alter publication supabase_realtime add table public.stock_takes;
alter publication supabase_realtime add table public.stock_take_lines;
alter publication supabase_realtime add table public.dispatches;
