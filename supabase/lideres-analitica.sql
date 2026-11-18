-- Iglesia MAI · general leader link + site analytics (run after personas.sql)
--
--   invitations.reusable → one "general" link that many leaders can use (sent to a group);
--                          every use creates its own active leader account.
--   staff.roles / ministry / leads_encuentro / leads_convencion → what each leader told us.
--   site_events          → anonymous visits and tool use from the public site.
--                          Anyone may insert; ONLY the owner (admin) can read.

-- ------------------------------------------------------------------
-- General leader link
-- ------------------------------------------------------------------

alter table public.invitations add column if not exists reusable boolean not null default false;
alter table public.invitations add column if not exists uses integer not null default 0;

alter table public.staff add column if not exists roles text[] not null default '{}';
alter table public.staff add column if not exists ministry text not null default '';
alter table public.staff add column if not exists leads_encuentro boolean not null default false;
alter table public.staff add column if not exists leads_convencion boolean not null default false;

-- The team list now carries the leader's roles and responsibilities.
drop function if exists public.list_team();
create function public.list_team()
returns table (
  user_id uuid, name text, role_label text, phone text, email text,
  photo_path text, status text, created_at timestamptz, disciples bigint,
  roles text[], ministry text, leads_encuentro boolean, leads_convencion boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, s.name, s.role_label, s.phone, s.email, s.photo_path, s.status, s.created_at,
         (select count(*) from public.people p where p.leader_id = s.user_id and p.status = 'activo'),
         s.roles, s.ministry, s.leads_encuentro, s.leads_convencion
    from public.staff s
   where public.is_staff() and s.status = 'activo'
   order by s.name;
$$;

revoke all on function public.list_team() from public, anon;
grant execute on function public.list_team() to authenticated;

-- ------------------------------------------------------------------
-- Site analytics
-- ------------------------------------------------------------------

create table if not exists public.site_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  text not null,
  session_id  text not null,
  kind        text not null,
  label       text not null default '',
  name        text not null default '',
  path        text not null default '',
  referrer    text not null default '',
  device      text not null default '',
  city        text not null default '',
  country     text not null default ''
);

create index if not exists site_events_created_at on public.site_events (created_at desc);

alter table public.site_events enable row level security;

drop policy if exists "Anyone logs site events" on public.site_events;
create policy "Anyone logs site events"
  on public.site_events for insert
  to anon, authenticated
  with check (
    char_length(visitor_id) between 6 and 40 and char_length(session_id) between 6 and 40
    and char_length(kind) <= 40 and char_length(label) <= 160 and char_length(name) <= 80
    and char_length(path) <= 120 and char_length(referrer) <= 160
    and char_length(device) <= 40 and char_length(city) <= 80 and char_length(country) <= 8
  );

drop policy if exists "Owner reads site events" on public.site_events;
create policy "Owner reads site events"
  on public.site_events for select
  to authenticated
  using (public.is_owner());

drop policy if exists "Owner deletes site events" on public.site_events;
create policy "Owner deletes site events"
  on public.site_events for delete
  to authenticated
  using (public.is_owner());
