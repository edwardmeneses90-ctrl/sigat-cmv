-- ============================================================
-- SIGAT CMV - MESA DE SERVICIO / SOLICITUDES Y TICKETS
-- ============================================================

begin;

create sequence if not exists public.solicitudes_servicio_ticket_seq start 1;

create table if not exists public.solicitudes_servicio (
  id uuid primary key default gen_random_uuid(),
  numero_ticket text not null unique,
  fecha_solicitud timestamptz not null default now(),

  solicitante_id uuid not null references public.personas(id) on update cascade on delete restrict,
  dependencia_id uuid null references public.dependencias(id) on update cascade on delete restrict,
  activo_id uuid null references public.activos(id) on update cascade on delete restrict,

  solicitante_nombre text not null,
  dependencia_nombre text null,
  placa_inventario text null,

  tipo text not null check (tipo in ('SOPORTE','MANTENIMIENTO')),
  asunto text not null,
  descripcion text not null,
  prioridad text not null default 'NORMAL' check (prioridad in ('BAJA','NORMAL','ALTA','URGENTE')),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','ASIGNADA','EN_PROCESO','RESUELTA','CERRADA','CANCELADA')),

  tecnico_asignado_id uuid null references public.personas(id) on update cascade on delete restrict,
  tecnico_asignado_nombre text null,

  fecha_asignacion timestamptz null,
  fecha_inicio timestamptz null,
  fecha_resolucion timestamptz null,
  fecha_cierre timestamptz null,
  observaciones_cierre text null,

  creado_desde_ip text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_solicitudes_servicio_estado on public.solicitudes_servicio(estado);
create index if not exists idx_solicitudes_servicio_fecha on public.solicitudes_servicio(fecha_solicitud desc);
create index if not exists idx_solicitudes_servicio_solicitante on public.solicitudes_servicio(solicitante_id);
create index if not exists idx_solicitudes_servicio_activo on public.solicitudes_servicio(activo_id);
create index if not exists idx_solicitudes_servicio_tecnico on public.solicitudes_servicio(tecnico_asignado_id);

create or replace function public.generar_numero_ticket()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('public.solicitudes_servicio_ticket_seq');
  return 'TKT-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.set_ticket_automatico()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero_ticket is null or btrim(new.numero_ticket) = '' then
    new.numero_ticket := public.generar_numero_ticket();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ticket_automatico on public.solicitudes_servicio;
create trigger trg_ticket_automatico
before insert or update on public.solicitudes_servicio
for each row execute function public.set_ticket_automatico();

-- Vinculación del soporte/mantenimiento con la solicitud que lo originó.
alter table public.soportes_tecnicos
  add column if not exists solicitud_id uuid null
  references public.solicitudes_servicio(id) on update cascade on delete restrict;

alter table public.mantenimientos
  add column if not exists solicitud_id uuid null
  references public.solicitudes_servicio(id) on update cascade on delete restrict;

create index if not exists idx_soportes_solicitud on public.soportes_tecnicos(solicitud_id);
create index if not exists idx_mantenimientos_solicitud on public.mantenimientos(solicitud_id);

-- ============================================================
-- RLS INTERNO
-- ============================================================
alter table public.solicitudes_servicio enable row level security;

drop policy if exists "solicitudes_select_authenticated" on public.solicitudes_servicio;
create policy "solicitudes_select_authenticated"
on public.solicitudes_servicio
for select
to authenticated
using (true);

drop policy if exists "solicitudes_insert_admin_tecnico" on public.solicitudes_servicio;
create policy "solicitudes_insert_admin_tecnico"
on public.solicitudes_servicio
for insert
to authenticated
with check (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN','TECNICO')
  )
);

drop policy if exists "solicitudes_update_admin_tecnico" on public.solicitudes_servicio;
create policy "solicitudes_update_admin_tecnico"
on public.solicitudes_servicio
for update
to authenticated
using (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN','TECNICO')
  )
)
with check (
  exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN','TECNICO')
  )
);

-- No DELETE: la trazabilidad se conserva.

-- ============================================================
-- FUNCIONES PUBLICAS CONTROLADAS
-- El visitante NO obtiene SELECT directo sobre personas/activos.
-- ============================================================

create or replace function public.listar_solicitantes_publicos()
returns table (
  id uuid,
  nombre text,
  dependencia_id uuid,
  dependencia text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    concat_ws(' ', p.nombres, p.apellidos)::text as nombre,
    p.dependencia_id,
    d.nombre::text as dependencia
  from public.personas p
  left join public.dependencias d on d.id = p.dependencia_id
  where p.activo = true
  order by p.nombres, p.apellidos;
$$;

create or replace function public.listar_activos_solicitante_publico(p_persona_id uuid)
returns table (
  id uuid,
  placa text,
  nombre_equipo text,
  marca text,
  modelo text,
  serial text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.codigo::text as placa,
    a.nombre_equipo::text,
    m.nombre::text as marca,
    a.modelo::text,
    a.serial::text
  from public.activos a
  left join public.marcas m on m.id = a.marca_id
  where a.responsable_id = p_persona_id
    and coalesce(a.estado::text, '') not in ('DADO_DE_BAJA','PERDIDO','HURTADO')
  order by a.codigo;
$$;

create or replace function public.crear_solicitud_publica(
  p_solicitante_id uuid,
  p_ultimos4 text,
  p_activo_id uuid,
  p_tipo text,
  p_asunto text,
  p_descripcion text
)
returns table (
  id uuid,
  numero_ticket text,
  fecha_solicitud timestamptz,
  estado text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona public.personas%rowtype;
  v_dependencia text;
  v_placa text;
  v_ticket text;
  v_id uuid;
  v_fecha timestamptz;
begin
  if p_solicitante_id is null then
    raise exception 'Debes seleccionar el funcionario solicitante.';
  end if;

  if p_ultimos4 is null or p_ultimos4 !~ '^[0-9]{4}$' then
    raise exception 'Ingresa los últimos 4 dígitos de la identificación.';
  end if;

  select * into v_persona
  from public.personas
  where id = p_solicitante_id
    and activo = true;

  if not found then
    raise exception 'Funcionario no válido.';
  end if;

  if right(regexp_replace(coalesce(v_persona.identificacion,''), '[^0-9]', '', 'g'), 4) <> p_ultimos4 then
    raise exception 'Los últimos 4 dígitos de identificación no coinciden.';
  end if;

  if upper(coalesce(p_tipo,'')) not in ('SOPORTE','MANTENIMIENTO') then
    raise exception 'Tipo de solicitud no válido.';
  end if;

  if length(btrim(coalesce(p_asunto,''))) < 4 then
    raise exception 'Escribe un asunto más descriptivo.';
  end if;

  if length(btrim(coalesce(p_descripcion,''))) < 8 then
    raise exception 'Describe con más detalle la solicitud.';
  end if;

  select d.nombre into v_dependencia
  from public.dependencias d
  where d.id = v_persona.dependencia_id;

  if p_activo_id is not null then
    select a.codigo into v_placa
    from public.activos a
    where a.id = p_activo_id
      and a.responsable_id = p_solicitante_id;

    if not found then
      raise exception 'El equipo seleccionado no está asignado al funcionario.';
    end if;
  end if;

  insert into public.solicitudes_servicio (
    numero_ticket,
    solicitante_id,
    dependencia_id,
    activo_id,
    solicitante_nombre,
    dependencia_nombre,
    placa_inventario,
    tipo,
    asunto,
    descripcion,
    prioridad,
    estado
  ) values (
    public.generar_numero_ticket(),
    v_persona.id,
    v_persona.dependencia_id,
    p_activo_id,
    concat_ws(' ', v_persona.nombres, v_persona.apellidos),
    v_dependencia,
    v_placa,
    upper(p_tipo),
    btrim(p_asunto),
    btrim(p_descripcion),
    'NORMAL',
    'PENDIENTE'
  )
  returning solicitudes_servicio.id,
            solicitudes_servicio.numero_ticket,
            solicitudes_servicio.fecha_solicitud
  into v_id, v_ticket, v_fecha;

  return query select v_id, v_ticket, v_fecha, 'PENDIENTE'::text;
end;
$$;

revoke all on function public.listar_solicitantes_publicos() from public;
revoke all on function public.listar_activos_solicitante_publico(uuid) from public;
revoke all on function public.crear_solicitud_publica(uuid,text,uuid,text,text,text) from public;

grant execute on function public.listar_solicitantes_publicos() to anon, authenticated;
grant execute on function public.listar_activos_solicitante_publico(uuid) to anon, authenticated;
grant execute on function public.crear_solicitud_publica(uuid,text,uuid,text,text,text) to anon, authenticated;

commit;
