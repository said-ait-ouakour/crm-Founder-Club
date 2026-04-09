-- Added via MCP migration: add_lead_shares_and_rpc_visibility
-- This file mirrors the key schema/RPC additions for repository tracking.

create table if not exists public.lead_shares (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default now(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  shared_by bigint references public.users(id) on delete set null,
  can_edit boolean not null default false,
  access_level text not null default 'view',
  constraint lead_shares_access_level_check check (access_level in ('view', 'edit')),
  constraint lead_shares_lead_id_user_id_key unique (lead_id, user_id)
);

create index if not exists idx_lead_shares_lead_id on public.lead_shares(lead_id);
create index if not exists idx_lead_shares_user_id on public.lead_shares(user_id);

create or replace function public.get_visible_lead_ids(p_auth_user_id uuid)
returns table (lead_id uuid, is_assigned boolean, is_shared boolean)
language sql
security definer
set search_path = public
as $$
  with viewer as (
    select u.id as user_id
    from public.users u
    where u.user_id = p_auth_user_id
    limit 1
  ),
  assigned as (
    select ul.lead_id, true as is_assigned, false as is_shared
    from public.users_leads ul
    join viewer v on v.user_id = ul.user_id
  ),
  shared as (
    select ls.lead_id, false as is_assigned, true as is_shared
    from public.lead_shares ls
    join viewer v on v.user_id = ls.user_id
  )
  select
    coalesce(a.lead_id, s.lead_id) as lead_id,
    coalesce(a.is_assigned, false) as is_assigned,
    coalesce(s.is_shared, false) as is_shared
  from assigned a
  full outer join shared s on s.lead_id = a.lead_id;
$$;

create or replace function public.share_lead_with_user(
  p_lead_id uuid,
  p_user_id bigint,
  p_shared_by_auth_user_id uuid default null,
  p_can_edit boolean default false,
  p_access_level text default 'view'
)
returns public.lead_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shared_by bigint;
  v_row public.lead_shares;
begin
  if p_shared_by_auth_user_id is not null then
    select id into v_shared_by from public.users where user_id = p_shared_by_auth_user_id limit 1;
  end if;

  insert into public.lead_shares (lead_id, user_id, shared_by, can_edit, access_level)
  values (p_lead_id, p_user_id, v_shared_by, coalesce(p_can_edit, false), coalesce(p_access_level, 'view'))
  on conflict (lead_id, user_id)
  do update set
    shared_by = excluded.shared_by,
    can_edit = excluded.can_edit,
    access_level = excluded.access_level
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.unshare_lead_from_user(
  p_lead_id uuid,
  p_user_id bigint
)
returns boolean
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.lead_shares
    where lead_id = p_lead_id
      and user_id = p_user_id
    returning 1
  )
  select exists(select 1 from deleted);
$$;

create or replace function public.share_lead_with_auth_user(
  p_lead_id uuid,
  p_target_auth_user_id uuid,
  p_shared_by_auth_user_id uuid default null,
  p_can_edit boolean default false,
  p_access_level text default 'view'
)
returns public.lead_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user_id bigint;
  v_shared_by bigint;
  v_row public.lead_shares;
begin
  select id into v_target_user_id from public.users where user_id = p_target_auth_user_id limit 1;
  if v_target_user_id is null then
    raise exception 'Target user not found for auth user id %', p_target_auth_user_id;
  end if;

  if p_shared_by_auth_user_id is not null then
    select id into v_shared_by from public.users where user_id = p_shared_by_auth_user_id limit 1;
  end if;

  insert into public.lead_shares (lead_id, user_id, shared_by, can_edit, access_level)
  values (p_lead_id, v_target_user_id, v_shared_by, coalesce(p_can_edit, false), coalesce(p_access_level, 'view'))
  on conflict (lead_id, user_id)
  do update set
    shared_by = excluded.shared_by,
    can_edit = excluded.can_edit,
    access_level = excluded.access_level
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.unshare_lead_from_auth_user(
  p_lead_id uuid,
  p_target_auth_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  with target_user as (
    select id as user_id from public.users where user_id = p_target_auth_user_id limit 1
  ),
  deleted as (
    delete from public.lead_shares ls
    using target_user tu
    where ls.lead_id = p_lead_id
      and ls.user_id = tu.user_id
    returning 1
  )
  select exists(select 1 from deleted);
$$;

-- NOTE:
-- `public.get_leads_filtered(...)` was updated in DB to include:
-- - visibility scope filter (all/assigned_to_me/shared_with_me/shared_by_me)
-- - share status filter (shared/not_shared)
-- - lead JSON flags: is_assigned_to_viewer, is_shared_with_viewer, is_shared_by_viewer, is_shared
