-- Iglesia MAI · Diseño del popup de anuncios. Safe to run again.
--   layout: 'lateral'    → flyer vertical o cuadrado a la izquierda, texto a la derecha
--           'horizontal' → imagen horizontal completa, texto encima en la parte de abajo
--           'imagen'     → solo la imagen (opcionalmente con el botón sobre ella)
--   mobile_image_path: versión vertical para celulares (si falta, se usa la principal)

alter table public.announcements add column if not exists layout text not null default 'lateral';
alter table public.announcements add column if not exists mobile_image_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'announcements_layout_check') then
    alter table public.announcements add constraint announcements_layout_check check (layout in ('lateral', 'horizontal', 'imagen'));
  end if;
end $$;
