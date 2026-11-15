-- Iglesia MAI · Accesos: invitaciones, cuentas del equipo y permisos.
-- Run AFTER schema.sql (Supabase → SQL Editor, or `supabase db query`). Safe to run again.
--
-- How it works
--   1. Someone with the "usuarios" permission creates an invitation in the panel.
--      Only a SHA-256 hash of the link's token is stored here.
--   2. The invited person opens /#/registro/<token>, fills in their data, username
--      and password. api/registro.ts (service role) creates their login and a
--      staff row with status 'pendiente' and NO permissions.
--   3. The owner (or someone the owner gave "usuarios") approves the person and
--      ticks the modules they may use. Only the owner can hand out "usuarios".

-- ------------------------------------------------------------------
-- Staff profile, status and permissions
-- ------------------------------------------------------------------

alter table public.staff add column if not exists username      text;
alter table public.staff add column if not exists email         text not null default '';
alter table public.staff add column if not exists phone         text not null default '';
alter table public.staff add column if not exists doc_type      text not null default '';
alter table public.staff add column if not exists doc_number    text not null default '';
alter table public.staff add column if not exists birth_date    date;
alter table public.staff add column if not exists address       text not null default '';
alter table public.staff add column if not exists role_label    text not null default '';
alter table public.staff add column if not exists status        text not null default 'activo';
alter table public.staff add column if not exists permissions   text[] not null default '{}';
alter table public.staff add column if not exists is_owner      boolean not null default false;
alter table public.staff add column if not exists invitation_id uuid;
alter table public.staff add column if not exists approved_by   uuid references auth.users (id) on delete set null;
alter table public.staff add column if not exists approved_at   timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_status_check') then
    alter table public.staff add constraint staff_status_check
      check (status in ('pendiente', 'activo', 'suspendido', 'rechazado'));
  end if;
end $$;

create unique index if not exists staff_username_key on public.staff (lower(username));

-- The account created on 2026-11-05 ("Admin") is the owner: full access.
update public.staff s
   set is_owner = true, status = 'activo', username = coalesce(s.username, 'admin')
  from auth.users u
 where u.id = s.user_id and u.email = 'admin@iglesiamai.com';

-- The modules a person can be given. Keep in sync with src/lib/staff.ts (PERMISSIONS).
create or replace function public.valid_permissions()
returns text[]
language sql
immutable
as $$
  select array['solicitudes', 'anuncios', 'personas', 'equipo', 'encuentros', 'universidad',
               'capacitacion', 'pagos', 'gastos', 'documentos', 'reportes', 'usuarios'];
$$;

-- An ACTIVE member of the team (pending, suspended or rejected accounts see nothing).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and status = 'activo');
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and status = 'activo' and is_owner);
$$;

create or replace function public.has_perm(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
     where user_id = auth.uid() and status = 'activo' and (is_owner or perm = any (permissions))
  );
$$;

drop policy if exists "Staff reads own row" on public.staff;
create policy "Staff reads own row"
  on public.staff for select
  to authenticated
  using (user_id = auth.uid() or public.has_perm('usuarios'));

-- No insert/update/delete policies on staff: rows are created by api/registro.ts
-- (service role) and changed only through set_staff_access() below.

/**
 * Approve, suspend or reject a person and set the modules they may use.
 * - Needs the "usuarios" permission; nobody can change themselves or the owner.
 * - Only the owner can give or take "usuarios", or change someone who has it.
 */
create or replace function public.set_staff_access(target uuid, new_status text, new_permissions text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.staff;
  caller_is_owner boolean := public.is_owner();
  perms text[];
begin
  if not public.has_perm('usuarios') then
    raise exception 'No tienes permiso para administrar usuarios.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'No puedes cambiar tus propios permisos.' using errcode = '42501';
  end if;
  select * into target_row from public.staff where user_id = target;
  if not found then
    raise exception 'La persona no existe.';
  end if;
  if target_row.is_owner then
    raise exception 'El acceso del administrador principal no se puede cambiar.' using errcode = '42501';
  end if;
  if new_status not in ('pendiente', 'activo', 'suspendido', 'rechazado') then
    raise exception 'Estado no válido.';
  end if;

  select coalesce(array_agg(distinct p), '{}') into perms
    from unnest(coalesce(new_permissions, '{}')) as p
   where p = any (public.valid_permissions());

  if not caller_is_owner and ('usuarios' = any (target_row.permissions) or 'usuarios' = any (perms)) then
    raise exception 'Solo el administrador principal puede dar o quitar el permiso de usuarios.' using errcode = '42501';
  end if;

  update public.staff
     set status = new_status,
         permissions = perms,
         approved_by = case when new_status = 'activo' and target_row.status <> 'activo' then auth.uid() else approved_by end,
         approved_at = case when new_status = 'activo' and target_row.status <> 'activo' then now() else approved_at end
   where user_id = target;
end;
$$;

revoke all on function public.set_staff_access(uuid, text, text[]) from public, anon;
grant execute on function public.set_staff_access(uuid, text, text[]) to authenticated;

-- ------------------------------------------------------------------
-- Invitations
-- ------------------------------------------------------------------

create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  token_hash       text not null unique,
  name             text not null default '',
  email            text not null default '',
  phone            text not null default '',
  role_label       text not null default '',
  expires_at       timestamptz not null,
  created_by       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_by_name  text not null default '',
  created_at       timestamptz not null default now(),
  used_at          timestamptz,
  used_by          uuid references auth.users (id) on delete set null,
  revoked_at       timestamptz
);

alter table public.invitations enable row level security;

drop policy if exists "User managers read invitations" on public.invitations;
create policy "User managers read invitations"
  on public.invitations for select
  to authenticated
  using (public.has_perm('usuarios'));

drop policy if exists "User managers create invitations" on public.invitations;
create policy "User managers create invitations"
  on public.invitations for insert
  to authenticated
  with check (public.has_perm('usuarios') and created_by = auth.uid() and used_at is null and revoked_at is null);

drop policy if exists "User managers revoke invitations" on public.invitations;
create policy "User managers revoke invitations"
  on public.invitations for update
  to authenticated
  using (public.has_perm('usuarios'))
  with check (public.has_perm('usuarios'));

-- ------------------------------------------------------------------
-- Module permissions on the existing data
-- ------------------------------------------------------------------

drop policy if exists "Staff can read submissions" on public.submissions;
create policy "Staff can read submissions"
  on public.submissions for select
  to authenticated
  using (public.has_perm('solicitudes'));

drop policy if exists "Staff can update submissions" on public.submissions;
create policy "Staff can update submissions"
  on public.submissions for update
  to authenticated
  using (public.has_perm('solicitudes'))
  with check (public.has_perm('solicitudes'));

drop policy if exists "Staff can delete submissions" on public.submissions;
create policy "Staff can delete submissions"
  on public.submissions for delete
  to authenticated
  using (public.has_perm('solicitudes'));

drop policy if exists "Staff manages announcements" on public.announcements;
create policy "Staff manages announcements"
  on public.announcements for all
  to authenticated
  using (public.has_perm('anuncios'))
  with check (public.has_perm('anuncios'));

drop policy if exists "Staff uploads announcement images" on storage.objects;
create policy "Staff uploads announcement images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'anuncios' and public.has_perm('anuncios'))
  with check (bucket_id = 'anuncios' and public.has_perm('anuncios'));

drop policy if exists "Staff reads receipts" on storage.objects;
create policy "Staff reads receipts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes' and (public.has_perm('solicitudes') or public.has_perm('pagos')));

drop policy if exists "Staff deletes receipts" on storage.objects;
create policy "Staff deletes receipts"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'comprobantes' and public.has_perm('solicitudes'));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'staff') then
    alter publication supabase_realtime add table public.staff;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'invitations') then
    alter publication supabase_realtime add table public.invitations;
  end if;
end $$;
