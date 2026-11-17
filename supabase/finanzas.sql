-- Iglesia MAI · Fase 4: pagos, gastos, documentos, certificados, reportes y auditoría.
-- Run AFTER schema.sql, accesos.sql and personas.sql. Safe to run again.

-- ------------------------------------------------------------------
-- Payments (income)
-- ------------------------------------------------------------------

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid references public.people (id) on delete set null,
  payer_name    text not null default '',
  concept       text not null default 'Ofrenda',
  program       text not null default '',
  amount        bigint not null check (amount > 0),
  method        text not null default '',
  paid_at       date not null default (now() at time zone 'America/Bogota')::date,
  reference     text not null default '',
  notes         text not null default '',
  receipt_path  text,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists payments_paid_at_idx on public.payments (paid_at);
create index if not exists payments_person_idx on public.payments (person_id);

alter table public.payments enable row level security;
drop policy if exists "Treasury manages payments" on public.payments;
create policy "Treasury manages payments"
  on public.payments for all
  to authenticated
  using (public.has_perm('pagos'))
  with check (public.has_perm('pagos'));

-- ------------------------------------------------------------------
-- Expenses
-- ------------------------------------------------------------------

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  concept       text not null,
  category      text not null default 'Otros',
  program       text not null default '',
  amount        bigint not null check (amount > 0),
  provider      text not null default '',
  method        text not null default '',
  paid_at       date not null default (now() at time zone 'America/Bogota')::date,
  notes         text not null default '',
  support_path  text,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists expenses_paid_at_idx on public.expenses (paid_at);

alter table public.expenses enable row level security;
drop policy if exists "Treasury manages expenses" on public.expenses;
create policy "Treasury manages expenses"
  on public.expenses for all
  to authenticated
  using (public.has_perm('gastos'))
  with check (public.has_perm('gastos'));

-- ------------------------------------------------------------------
-- Documents (uploaded files or generated from a template)
-- ------------------------------------------------------------------

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null default 'General',
  person_id   uuid references public.people (id) on delete set null,
  file_path   text,
  file_type   text not null default '',
  file_size   bigint not null default 0,
  body        text,
  notes       text not null default '',
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.documents enable row level security;
drop policy if exists "Staff manages documents" on public.documents;
create policy "Staff manages documents"
  on public.documents for all
  to authenticated
  using (public.has_perm('documentos'))
  with check (public.has_perm('documentos'));

-- ------------------------------------------------------------------
-- Certificates
-- ------------------------------------------------------------------

create sequence if not exists public.certificate_seq;

create table if not exists public.certificates (
  id           uuid primary key default gen_random_uuid(),
  number       text not null unique default ('MAI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text, 4, '0')),
  person_id    uuid references public.people (id) on delete set null,
  person_name  text not null,
  person_doc   text not null default '',
  program      text not null default '',
  template_id  text not null default '',
  title        text not null default '',
  issued_at    date not null default (now() at time zone 'America/Bogota')::date,
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.certificates enable row level security;
drop policy if exists "Staff manages certificates" on public.certificates;
create policy "Staff manages certificates"
  on public.certificates for all
  to authenticated
  using (public.has_perm('documentos'))
  with check (public.has_perm('documentos'));

-- ------------------------------------------------------------------
-- Private bucket for receipts, expense supports and documents.
-- The first folder says which permission may touch the file.
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soportes', 'soportes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types, file_size_limit = excluded.file_size_limit;

drop policy if exists "Staff manages supports" on storage.objects;
create policy "Staff manages supports"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'soportes' and (
      ((storage.foldername(name))[1] = 'pagos' and public.has_perm('pagos'))
      or ((storage.foldername(name))[1] = 'gastos' and public.has_perm('gastos'))
      or ((storage.foldername(name))[1] = 'documentos' and public.has_perm('documentos'))
    )
  )
  with check (
    bucket_id = 'soportes' and (
      ((storage.foldername(name))[1] = 'pagos' and public.has_perm('pagos'))
      or ((storage.foldername(name))[1] = 'gastos' and public.has_perm('gastos'))
      or ((storage.foldername(name))[1] = 'documentos' and public.has_perm('documentos'))
    )
  );

-- ------------------------------------------------------------------
-- Reports: totals anyone with "reportes" may see (without the rows)
-- ------------------------------------------------------------------

create or replace function public.report_summary(year int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_perm('reportes') then
    raise exception 'No tienes permiso para ver reportes.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'income_by_month', coalesce((select jsonb_object_agg(m, total) from (
        select extract(month from paid_at)::int m, sum(amount) total from public.payments
         where extract(year from paid_at) = year group by 1) x), '{}'::jsonb),
    'expense_by_month', coalesce((select jsonb_object_agg(m, total) from (
        select extract(month from paid_at)::int m, sum(amount) total from public.expenses
         where extract(year from paid_at) = year group by 1) x), '{}'::jsonb),
    'income_by_concept', coalesce((select jsonb_object_agg(concept, total) from (
        select concept, sum(amount) total from public.payments
         where extract(year from paid_at) = year group by 1) x), '{}'::jsonb),
    'expense_by_category', coalesce((select jsonb_object_agg(category, total) from (
        select category, sum(amount) total from public.expenses
         where extract(year from paid_at) = year group by 1) x), '{}'::jsonb),
    'people_by_program', coalesce((select jsonb_object_agg(program, total) from (
        select program, count(*) total from public.people where status = 'activo' group by 1) x), '{}'::jsonb),
    'new_people_by_month', coalesce((select jsonb_object_agg(m, total) from (
        select extract(month from created_at at time zone 'America/Bogota')::int m, count(*) total from public.people
         where status <> 'rechazado' and extract(year from created_at at time zone 'America/Bogota') = year group by 1) x), '{}'::jsonb),
    'people_active', (select count(*) from public.people where status = 'activo'),
    'people_total', (select count(*) from public.people where status <> 'rechazado'),
    'leaders', (select count(*) from public.staff where status = 'activo' and role_label ilike 'l_der%'),
    'certificates', (select count(*) from public.certificates where extract(year from issued_at) = year),
    'payments_count', (select count(*) from public.payments where extract(year from paid_at) = year),
    'expenses_count', (select count(*) from public.expenses where extract(year from paid_at) = year)
  ) into result;
  return result;
end;
$$;

revoke all on function public.report_summary(int) from public, anon;
grant execute on function public.report_summary(int) to authenticated;

-- ------------------------------------------------------------------
-- Audit log: every change to the important tables, written by triggers
-- ------------------------------------------------------------------

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  user_id    uuid,
  user_name  text not null default '',
  action     text not null,
  module     text not null,
  record     text not null default '',
  detail     text not null default ''
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;
drop policy if exists "Owner reads audit" on public.audit_log;
create policy "Owner reads audit"
  on public.audit_log for select
  to authenticated
  using (public.is_owner());
-- No insert/update/delete policies: only the trigger below writes, nobody edits.

create or replace function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := auth.uid();
  who_name text;
  row_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  r jsonb := coalesce(row_new, row_old);
  label text;
  changed text := '';
  k text;
begin
  select name into who_name from public.staff where user_id = who;
  label := coalesce(r ->> 'full_name', r ->> 'person_name', r ->> 'title', r ->> 'concept', r ->> 'name', r ->> 'key', r ->> 'number', '');
  if tg_table_name = 'payments' or tg_table_name = 'expenses' then
    label := trim(both ' ' from label || ' · $' || replace(to_char((r ->> 'amount')::bigint, 'FM999,999,999'), ',', '.'));
  end if;
  if tg_op = 'UPDATE' then
    for k in select key from jsonb_each(row_new) loop
      continue when k in ('updated_at', 'created_at');
      if row_new -> k is distinct from row_old -> k then
        changed := changed || case when changed = '' then '' else ', ' end || k;
      end if;
    end loop;
    if changed = '' then return new; end if;
  end if;
  insert into public.audit_log (user_id, user_name, action, module, record, detail)
  values (
    who,
    coalesce(who_name, case when who is null then 'Sistema / formulario público' else 'Usuario' end),
    case tg_op when 'INSERT' then 'Creó' when 'UPDATE' then 'Modificó' else 'Eliminó' end,
    tg_table_name,
    left(label, 160),
    left(changed, 300)
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['people', 'payments', 'expenses', 'documents', 'certificates', 'staff', 'invitations', 'settings', 'announcements'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_change()', t);
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'expenses') then
    alter publication supabase_realtime add table public.expenses;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'documents') then
    alter publication supabase_realtime add table public.documents;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'certificates') then
    alter publication supabase_realtime add table public.certificates;
  end if;
end $$;
