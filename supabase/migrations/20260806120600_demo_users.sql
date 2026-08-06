-- NEXUS Stock :: 07 demo accounts
--
-- Three accounts, one per role, so role-based access can be checked
-- against the real RLS policies rather than taken on trust:
--
--   admin@nexusstock.app      admin           - sees all 5 sites, can approve
--   supervisor@nexusstock.app site_supervisor - sees all 5 sites, can approve
--   staff@nexusstock.app      staff           - scoped to JHB + WKS only
--
-- All three use the password NexusStock2026! - change them before this
-- carries real stock data.

do $$
declare
  v_admin_id      uuid := gen_random_uuid();
  v_supervisor_id uuid := gen_random_uuid();
  v_staff_id      uuid := gen_random_uuid();
  v_jhb           uuid;
  v_wks           uuid;
  v_main          uuid;
begin
  select id into v_jhb  from public.sites where code = 'JHB';
  select id into v_wks  from public.sites where code = 'WKS';
  select id into v_main from public.sites where code = 'MAIN';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000',
         v.id, 'authenticated', 'authenticated', v.email,
         crypt('NexusStock2026!', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', v.full_name),
         now(), now(), '', '', '', ''
    from (values
      (v_admin_id,      'admin@nexusstock.app',      'Louis Kruger'),
      (v_supervisor_id, 'supervisor@nexusstock.app', 'Site Supervisor'),
      (v_staff_id,      'staff@nexusstock.app',      'Stores Assistant')
    ) as v(id, email, full_name);

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  select gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
    from auth.users u
   where u.email in ('admin@nexusstock.app', 'supervisor@nexusstock.app', 'staff@nexusstock.app');

  -- handle_new_user() has already created the profile rows; set the roles.
  update public.profiles set role = 'admin',           home_site_id = v_main where id = v_admin_id;
  update public.profiles set role = 'site_supervisor', home_site_id = v_main where id = v_supervisor_id;
  update public.profiles set role = 'staff',           home_site_id = v_jhb  where id = v_staff_id;

  -- The staff account also covers the workshop store, which is what makes
  -- the multi-site (but not all-site) case visible when testing.
  insert into public.user_sites (user_id, site_id) values (v_staff_id, v_wks);
end $$;
