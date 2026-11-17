-- Iglesia MAI · Personas, líderes, discípulos, fotos y configuración.
-- Run AFTER schema.sql and accesos.sql. Safe to run again.
--
--   people        → everyone the church accompanies (members, disciples, visitors…)
--   staff         → gets a photo and a personal join code (the leader's disciple link)
--   invitations   → a "lider" invitation activates the account on its own,
--                   with the permissions chosen when the link was created
--   settings      → Configuración (church info, roles, programs, payment methods…)
--   fotos bucket  → private photos of people and team members

-- ------------------------------------------------------------------
-- Staff: photo + personal join code
-- ------------------------------------------------------------------

alter table public.staff add column if not exists photo_path text;
alter table public.staff add column if not exists join_code  text;
update public.staff set join_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) where join_code is null;
alter table public.staff alter column join_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
create unique index if not exists staff_join_code_key on public.staff (join_code);

-- ------------------------------------------------------------------
-- Invitations: kind + permissions given on registration
-- ------------------------------------------------------------------

alter table public.invitations add column if not exists kind text not null default 'persona';
alter table public.invitations add column if not exists auto_permissions text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invitations_kind_check') then
    alter table public.invitations add constraint invitations_kind_check check (kind in ('persona', 'lider'));
  end if;
end $$;

-- Only the owner can create links that hand out "usuarios" by themselves.
drop policy if exists "User managers create invitations" on public.invitations;
create policy "User managers create invitations"
  on public.invitations for insert
  to authenticated
  with check (
    public.has_perm('usuarios') and created_by = auth.uid() and used_at is null and revoked_at is null
    and auto_permissions <@ public.valid_permissions()
    and (public.is_owner() or not ('usuarios' = any (auto_permissions)))
  );

-- ------------------------------------------------------------------
-- People
-- ------------------------------------------------------------------

create table if not exists public.people (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  doc_type          text not null default 'CC',
  doc_number        text not null default '',
  birth_date        date,
  gender            text not null default '',
  phone             text not null default '',
  email             text not null default '',
  address           text not null default '',
  emergency_contact text not null default '',
  role              text not null default 'Discípulo',
  program           text not null default '',
  program_step      text not null default '',
  leader_id         uuid references public.staff (user_id) on delete set null,
  status            text not null default 'activo',
  source            text not null default 'panel',
  notes             text not null default '',
  photo_path        text,
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint people_status_check check (status in ('pendiente', 'activo', 'inactivo', 'rechazado')),
  constraint people_name_check check (char_length(full_name) between 2 and 120)
);

create index if not exists people_leader_idx on public.people (leader_id);
create index if not exists people_program_idx on public.people (program);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();

-- Which permission manages each program's participants.
create or replace function public.program_perm(program text)
returns text
language sql
immutable
as $$
  select case program
    when 'encuentro' then 'encuentros'
    when 'mision180' then 'universidad'
    when 'destino' then 'capacitacion'
    else 'personas'
  end;
$$;

alter table public.people enable row level security;

drop policy if exists "Staff reads people" on public.people;
create policy "Staff reads people"
  on public.people for select
  to authenticated
  using (
    public.has_perm('personas')
    or (leader_id = auth.uid() and public.has_perm('equipo'))
    or (program <> '' and public.has_perm(public.program_perm(program)))
  );

drop policy if exists "Staff adds people" on public.people;
create policy "Staff adds people"
  on public.people for insert
  to authenticated
  with check (
    public.has_perm('personas')
    or (leader_id = auth.uid() and public.has_perm('equipo'))
    or (program <> '' and public.has_perm(public.program_perm(program)))
  );

drop policy if exists "Staff updates people" on public.people;
create policy "Staff updates people"
  on public.people for update
  to authenticated
  using (
    public.has_perm('personas')
    or (leader_id = auth.uid() and public.has_perm('equipo'))
    or (program <> '' and public.has_perm(public.program_perm(program)))
  )
  with check (
    public.has_perm('personas')
    or (leader_id = auth.uid() and public.has_perm('equipo'))
    or (program <> '' and public.has_perm(public.program_perm(program)))
  );

drop policy if exists "Staff deletes people" on public.people;
create policy "Staff deletes people"
  on public.people for delete
  to authenticated
  using (public.has_perm('personas') or (leader_id = auth.uid() and public.has_perm('equipo')));

-- ------------------------------------------------------------------
-- The team as everyone on it may see it (no documents, no permissions)
-- ------------------------------------------------------------------

create or replace function public.list_team()
returns table (
  user_id uuid, name text, role_label text, phone text, email text,
  photo_path text, status text, created_at timestamptz, disciples bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id, s.name, s.role_label, s.phone, s.email, s.photo_path, s.status, s.created_at,
         (select count(*) from public.people p where p.leader_id = s.user_id and p.status = 'activo')
    from public.staff s
   where public.is_staff() and s.status = 'activo'
   order by s.name;
$$;

revoke all on function public.list_team() from public, anon;
grant execute on function public.list_team() to authenticated;

-- A team member's photo: their own, or anyone's for user managers.
create or replace function public.set_staff_photo(target uuid, path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (target = auth.uid() and public.is_staff()) and not public.has_perm('usuarios') then
    raise exception 'No puedes cambiar esta foto.' using errcode = '42501';
  end if;
  update public.staff set photo_path = path where user_id = target;
end;
$$;

revoke all on function public.set_staff_photo(uuid, text) from public, anon;
grant execute on function public.set_staff_photo(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- Settings (Configuración): one JSON value per section
-- ------------------------------------------------------------------

create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid() references auth.users (id) on delete set null
);

alter table public.settings enable row level security;

drop policy if exists "Staff reads settings" on public.settings;
create policy "Staff reads settings"
  on public.settings for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Owner writes settings" on public.settings;
create policy "Owner writes settings"
  on public.settings for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Storage used per bucket (Configuración → Almacenamiento).
create or replace function public.storage_usage()
returns table (bucket text, files bigint, bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select o.bucket_id, count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    from storage.objects o
   where public.is_owner()
   group by o.bucket_id;
$$;

revoke all on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated;

-- ------------------------------------------------------------------
-- Photos bucket (private: the panel shows them with short-lived links)
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Staff manages photos" on storage.objects;
create policy "Staff manages photos"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'fotos' and public.is_staff())
  with check (bucket_id = 'fotos' and public.is_staff());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'people') then
    alter publication supabase_realtime add table public.people;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'settings') then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;
