-- ============================================================
-- SIGAT CMV
-- MANTENIMIENTOS PROGRAMADOS CON TICKET AUTOMÁTICO
-- ============================================================
--
-- OBJETIVO:
-- 1. Los mantenimientos provenientes de una solicitud de usuario
--    siguen usando su ticket existente.
-- 2. Si ADMIN/TECNICO crea un mantenimiento directamente,
--    SIGAT genera automáticamente un ticket interno.
-- ============================================================

begin;

-- Permitir solicitudes internas sin persona solicitante.
alter table public.solicitudes_servicio
  alter column solicitante_id drop not null;

-- Identificar claramente el origen del ticket.
alter table public.solicitudes_servicio
  add column if not exists origen text not null default 'USUARIO';

alter table public.solicitudes_servicio
  drop constraint if exists solicitudes_servicio_origen_check;

alter table public.solicitudes_servicio
  add constraint solicitudes_servicio_origen_check
  check (origen in ('USUARIO', 'INTERNO'));

-- Los registros existentes corresponden al flujo original del usuario.
update public.solicitudes_servicio
set origen = 'USUARIO'
where origen is null
   or origen not in ('USUARIO', 'INTERNO');

-- ============================================================
-- RPC: crear ticket interno para mantenimiento programado
-- ============================================================

create or replace function public.crear_ticket_mantenimiento_interno(
  p_activo_id uuid,
  p_asunto text,
  p_descripcion text,
  p_tecnico_id uuid default null,
  p_tecnico_nombre text default null
)
returns table (
  id uuid,
  numero_ticket text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_activo public.activos%rowtype;
  v_dependencia_nombre text;
  v_ticket_id uuid;
  v_numero_ticket text;
begin
  select p.rol::text
  into v_rol
  from public.perfiles as p
  where p.id = auth.uid()
    and p.activo = true;

  if coalesce(v_rol, '') not in ('ADMIN', 'TECNICO') then
    raise exception 'No tienes permisos para programar mantenimientos.';
  end if;

  if p_activo_id is null then
    raise exception 'Debes seleccionar el activo.';
  end if;

  select a.*
  into v_activo
  from public.activos as a
  where a.id = p_activo_id;

  if not found then
    raise exception 'Activo no encontrado.';
  end if;

  if v_activo.dependencia_id is not null then
    select d.nombre
    into v_dependencia_nombre
    from public.dependencias as d
    where d.id = v_activo.dependencia_id;
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
    estado,
    tecnico_asignado_id,
    tecnico_asignado_nombre,
    fecha_asignacion,
    fecha_inicio,
    origen
  )
  values (
    public.generar_numero_ticket(),
    null,
    v_activo.dependencia_id,
    v_activo.id,
    'Gestión TIC',
    coalesce(v_dependencia_nombre, 'Sistemas'),
    v_activo.codigo,
    'MANTENIMIENTO',
    coalesce(nullif(btrim(p_asunto), ''), 'Mantenimiento programado por Gestión TIC'),
    coalesce(nullif(btrim(p_descripcion), ''), 'Mantenimiento programado internamente por Gestión TIC.'),
    'NORMAL',
    'EN_PROCESO',
    p_tecnico_id,
    nullif(btrim(coalesce(p_tecnico_nombre, '')), ''),
    now(),
    now(),
    'INTERNO'
  )
  returning
    solicitudes_servicio.id,
    solicitudes_servicio.numero_ticket
  into
    v_ticket_id,
    v_numero_ticket;

  return query
  select v_ticket_id, v_numero_ticket;
end;
$$;

revoke all
on function public.crear_ticket_mantenimiento_interno(
  uuid,
  text,
  text,
  uuid,
  text
)
from public;

grant execute
on function public.crear_ticket_mantenimiento_interno(
  uuid,
  text,
  text,
  uuid,
  text
)
to authenticated;

commit;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

select
  numero_ticket,
  origen,
  tipo,
  estado,
  solicitante_nombre,
  placa_inventario,
  asunto
from public.solicitudes_servicio
order by fecha_solicitud desc
limit 20;
