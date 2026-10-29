-- Iglesia MAI · Supabase schema
-- Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
-- Matches src/lib/submissions.ts, announcements.ts, files.ts and auth.ts.

-- ------------------------------------------------------------------
-- Staff: who may enter the internal panel. Having a login is NOT enough;
-- the user must be listed here (add people with the insert at the end).
-- ------------------------------------------------------------------

create table if not exists public.staff (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.staff enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

drop policy if exists "Staff reads own row" on public.staff;
create policy "Staff reads own row"
  on public.staff for select
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------------
-- Requests sent from the public website
-- ------------------------------------------------------------------

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('oracion', 'visita', 'ujier', 'inscripcion')),
  status      text not null default 'nueva' check (status in ('nueva', 'en_proceso', 'atendida')),
  data        jsonb not null check (pg_column_size(data) < 20000),
  created_at  timestamptz not null default now()
);

create index if not exists submissions_kind_created_idx
  on public.submissions (kind, created_at desc);

alter table public.submissions enable row level security;

-- Anyone visiting the website can SEND a request, but can never read others'.
drop policy if exists "Public can create submissions" on public.submissions;
create policy "Public can create submissions"
  on public.submissions for insert
  to anon, authenticated
  with check (status = 'nueva');

drop policy if exists "Staff can read submissions" on public.submissions;
create policy "Staff can read submissions"
  on public.submissions for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can update submissions" on public.submissions;
create policy "Staff can update submissions"
  on public.submissions for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Staff can delete submissions" on public.submissions;
create policy "Staff can delete submissions"
  on public.submissions for delete
  to authenticated
  using (public.is_staff());

-- ------------------------------------------------------------------
-- Announcements (popup on the public site)
-- ------------------------------------------------------------------

create table if not exists public.announcements (
  id               uuid primary key default gen_random_uuid(),
  kicker           text not null default 'Próximo evento',
  title            text not null,
  description      text not null default '',
  image_path       text,                       -- file id "anuncios/<file>"
  event_date       date,
  event_time       text not null default '',
  location         text not null default '',
  cta_type         text not null default 'inscripcion' check (cta_type in ('inscripcion', 'enlace', 'ninguno')),
  cta_label        text not null default 'Inscríbete aquí',
  cta_url          text not null default '',
  requires_payment boolean not null default false,
  price            text not null default '',
  payment_info     text not null default '',
  active           boolean not null default true,
  show_from        date,
  show_until       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Public reads active announcements" on public.announcements;
create policy "Public reads active announcements"
  on public.announcements for select
  to anon, authenticated
  using (active or public.is_staff());

drop policy if exists "Staff manages announcements" on public.announcements;
create policy "Staff manages announcements"
  on public.announcements for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Live updates in the panel (new requests appear without reloading).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'submissions') then
    alter publication supabase_realtime add table public.submissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'announcements') then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;

-- ------------------------------------------------------------------
-- Storage
--   anuncios     → public bucket for announcement images
--   comprobantes → PRIVATE bucket for payment receipts
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('anuncios', 'anuncios', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('comprobantes', 'comprobantes', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff uploads announcement images" on storage.objects;
create policy "Staff uploads announcement images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'anuncios' and public.is_staff())
  with check (bucket_id = 'anuncios' and public.is_staff());

-- Visitors can upload a receipt but never list or read receipts.
drop policy if exists "Public uploads receipts" on storage.objects;
create policy "Public uploads receipts"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'comprobantes');

drop policy if exists "Staff reads receipts" on storage.objects;
create policy "Staff reads receipts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes' and public.is_staff());

drop policy if exists "Staff deletes receipts" on storage.objects;
create policy "Staff deletes receipts"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'comprobantes' and public.is_staff());

-- ------------------------------------------------------------------
-- Give someone access to the panel (after creating their user in
-- Authentication → Users). Replace the email and run:
--
--   insert into public.staff (user_id, name)
--   select id, 'Nombre' from auth.users where email = 'correo@ejemplo.com'
--   on conflict do nothing;
-- ------------------------------------------------------------------
