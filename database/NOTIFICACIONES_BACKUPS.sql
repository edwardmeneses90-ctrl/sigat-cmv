-- ============================================================
-- SIGAT CMV - NOTIFICACIONES DE TICKETS + COPIAS DE SEGURIDAD
-- ============================================================

begin;

-- ------------------------------------------------------------
-- CONFIGURACIÓN GENERAL
-- ------------------------------------------------------------
create table if not exists public.configuracion_sigat (
  id integer primary key default 1 check (id = 1),
  correo_notificaciones text null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

insert into public.configuracion_sigat (id)
values (1)
on conflict (id) do nothing;

alter table public.configuracion_sigat enable row level security;

drop policy if exists "config_sigat_select_admin" on public.configuracion_sigat;
create policy "config_sigat_select_admin"
on public.configuracion_sigat
for select
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text = 'ADMIN'
  )
);

drop policy if exists "config_sigat_update_admin" on public.configuracion_sigat;
create policy "config_sigat_update_admin"
on public.configuracion_sigat
for update
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text = 'ADMIN'
  )
)
with check (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text = 'ADMIN'
  )
);

-- ------------------------------------------------------------
-- COLA / HISTORIAL DE NOTIFICACIONES DE TICKET
-- ------------------------------------------------------------
create table if not exists public.notificaciones_ticket (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_servicio(id) on delete cascade,
  tipo text not null default 'CREACION',
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','ENVIADA','ERROR')),
  intentos integer not null default 0,
  ultimo_error text null,
  provider_id text null,
  enviado_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (solicitud_id, tipo)
);

create index if not exists idx_notificaciones_ticket_estado
  on public.notificaciones_ticket(estado, created_at);

alter table public.notificaciones_ticket enable row level security;

drop policy if exists "notificaciones_ticket_select_admin_tecnico"
  on public.notificaciones_ticket;
create policy "notificaciones_ticket_select_admin_tecnico"
on public.notificaciones_ticket
for select
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN','TECNICO')
  )
);

create or replace function public.encolar_notificacion_nuevo_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo notificamos tickets generados por solicitudes de usuarios.
  -- Los mantenimientos internos creados por Gestión TIC no generan correo.
  if coalesce(new.origen, 'USUARIO') = 'USUARIO' then
    insert into public.notificaciones_ticket (solicitud_id, tipo)
    values (new.id, 'CREACION')
    on conflict (solicitud_id, tipo) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_encolar_notificacion_nuevo_ticket
on public.solicitudes_servicio;

create trigger trg_encolar_notificacion_nuevo_ticket
after insert on public.solicitudes_servicio
for each row
execute function public.encolar_notificacion_nuevo_ticket();

-- ------------------------------------------------------------
-- METADATOS DE BACKUPS
-- ------------------------------------------------------------
create table if not exists public.backups_sigat (
  id uuid primary key default gen_random_uuid(),
  archivo text not null unique,
  tipo text not null default 'MANUAL',
  estado text not null default 'CREADO'
    check (estado in ('CREANDO','CREADO','RESTAURANDO','RESTAURADO','ERROR')),
  tamano_bytes bigint null,
  total_registros bigint null,
  creado_por uuid null references auth.users(id) on delete set null,
  creado_por_usuario text null,
  restaurado_at timestamptz null,
  ultimo_error text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_backups_sigat_created_at
  on public.backups_sigat(created_at desc);

alter table public.backups_sigat enable row level security;

drop policy if exists "backups_sigat_select_admin" on public.backups_sigat;
create policy "backups_sigat_select_admin"
on public.backups_sigat
for select
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text = 'ADMIN'
  )
);

-- Bucket privado. Las Edge Functions operan con service role.
insert into storage.buckets (id, name, public)
values ('sigat-backups', 'sigat-backups', false)
on conflict (id) do update set public = false;

-- ------------------------------------------------------------
-- RPC INTERNA PARA REAJUSTAR EL CONSECUTIVO DESPUÉS DE RESTAURAR
-- Solo service_role puede ejecutarla.
-- ------------------------------------------------------------
create or replace function public.reajustar_secuencia_tickets_backup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  select max(
    nullif(regexp_replace(numero_ticket, '^TKT-[0-9]{4}-', ''), '')::bigint
  )
  into v_max
  from public.solicitudes_servicio
  where numero_ticket ~ '^TKT-[0-9]{4}-[0-9]+$';

  if v_max is null then
    perform setval('public.solicitudes_servicio_ticket_seq', 1, false);
  else
    perform setval('public.solicitudes_servicio_ticket_seq', v_max, true);
  end if;
end;
$$;

revoke all on function public.reajustar_secuencia_tickets_backup() from public;
grant execute on function public.reajustar_secuencia_tickets_backup() to service_role;

commit;
