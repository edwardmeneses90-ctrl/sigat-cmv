-- ============================================================
-- SIGAT CMV
-- ETAPA 7 - MOVIMIENTOS E HISTORIAL
-- ============================================================

-- 1. TABLA DE MOVIMIENTOS

create table if not exists public.movimientos_activo (
  id uuid primary key default gen_random_uuid(),

  activo_id uuid not null references public.activos(id)
    on update cascade
    on delete restrict,

  tipo_movimiento text not null
    check (
      tipo_movimiento in (
        'ASIGNACION',
        'TRASLADO',
        'DEVOLUCION'
      )
    ),

  fecha_movimiento timestamptz not null default now(),

  dependencia_origen_id uuid references public.dependencias(id)
    on update cascade
    on delete set null,

  responsable_origen_id uuid references public.personas(id)
    on update cascade
    on delete set null,

  dependencia_destino_id uuid references public.dependencias(id)
    on update cascade
    on delete set null,

  responsable_destino_id uuid references public.personas(id)
    on update cascade
    on delete set null,

  motivo text,
  observaciones text,

  registrado_por uuid references public.perfiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_movimientos_activo
on public.movimientos_activo(activo_id);

create index if not exists idx_movimientos_fecha
on public.movimientos_activo(fecha_movimiento desc);

create index if not exists idx_movimientos_tipo
on public.movimientos_activo(tipo_movimiento);

alter table public.movimientos_activo enable row level security;

-- 2. LECTURA

drop policy if exists "movimientos_lectura_autenticada"
on public.movimientos_activo;

create policy "movimientos_lectura_autenticada"
on public.movimientos_activo
for select
to authenticated
using (
  public.usuario_sigat_activo()
);

-- 3. INSERCIÓN SOLO ADMIN

drop policy if exists "movimientos_admin_insert"
on public.movimientos_activo;

create policy "movimientos_admin_insert"
on public.movimientos_activo
for insert
to authenticated
with check (
  (select public.es_admin())
);

-- 4. FUNCIÓN TRANSACCIONAL PARA REGISTRAR MOVIMIENTO

create or replace function public.registrar_movimiento_activo(
  p_activo_id uuid,
  p_tipo_movimiento text,
  p_dependencia_destino_id uuid default null,
  p_responsable_destino_id uuid default null,
  p_motivo text default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_movimiento_id uuid;
  v_dependencia_origen uuid;
  v_responsable_origen uuid;
  v_nuevo_estado text;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_tipo_movimiento not in ('ASIGNACION', 'TRASLADO', 'DEVOLUCION') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  select
    dependencia_id,
    responsable_id
  into
    v_dependencia_origen,
    v_responsable_origen
  from public.activos
  where id = p_activo_id
  for update;

  if not found then
    raise exception 'Activo no encontrado';
  end if;

  if p_tipo_movimiento in ('ASIGNACION', 'TRASLADO') then
    if p_responsable_destino_id is null then
      raise exception 'Debe seleccionar un funcionario destino';
    end if;

    v_nuevo_estado := 'ASIGNADO';

  elsif p_tipo_movimiento = 'DEVOLUCION' then
    p_dependencia_destino_id := null;
    p_responsable_destino_id := null;
    v_nuevo_estado := 'DISPONIBLE';
  end if;

  insert into public.movimientos_activo (
    activo_id,
    tipo_movimiento,
    dependencia_origen_id,
    responsable_origen_id,
    dependencia_destino_id,
    responsable_destino_id,
    motivo,
    observaciones,
    registrado_por
  )
  values (
    p_activo_id,
    p_tipo_movimiento,
    v_dependencia_origen,
    v_responsable_origen,
    p_dependencia_destino_id,
    p_responsable_destino_id,
    nullif(trim(coalesce(p_motivo, '')), ''),
    nullif(trim(coalesce(p_observaciones, '')), ''),
    auth.uid()
  )
  returning id into v_movimiento_id;

  update public.activos
  set
    dependencia_id = p_dependencia_destino_id,
    responsable_id = p_responsable_destino_id,
    estado = v_nuevo_estado
  where id = p_activo_id;

  return v_movimiento_id;
end;
$$;

revoke all on function public.registrar_movimiento_activo(
  uuid, text, uuid, uuid, text, text
) from public;

grant execute on function public.registrar_movimiento_activo(
  uuid, text, uuid, uuid, text, text
) to authenticated;
