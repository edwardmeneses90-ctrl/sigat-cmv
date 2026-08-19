-- ============================================================
-- SIGAT CMV
-- ETAPA 11 - ROLES Y PERMISOS
-- ============================================================

-- ------------------------------------------------------------
-- 1. HELPERS DE AUTORIZACIÓN
-- ------------------------------------------------------------

create or replace function public.tiene_rol_sigat(
  roles_permitidos public.rol_sigat[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo = true
      and p.rol = any(roles_permitidos)
  );
$$;

revoke all on function public.tiene_rol_sigat(public.rol_sigat[]) from public;
grant execute on function public.tiene_rol_sigat(public.rol_sigat[]) to authenticated;

-- ------------------------------------------------------------
-- 2. PERFILES
-- ------------------------------------------------------------

drop policy if exists "perfiles_select_propio_o_admin" on public.perfiles;
drop policy if exists "perfiles_select_sigat" on public.perfiles;

create policy "perfiles_select_sigat"
on public.perfiles
for select
to authenticated
using (
  id = auth.uid()
  or (select public.es_admin())
);

drop policy if exists "perfiles_admin_update" on public.perfiles;

create policy "perfiles_admin_update"
on public.perfiles
for update
to authenticated
using (
  (select public.es_admin())
)
with check (
  (select public.es_admin())
);

-- ------------------------------------------------------------
-- 3. ACTIVOS
-- ADMIN + INVENTARIO escriben.
-- ------------------------------------------------------------

drop policy if exists "activos_admin_insert" on public.activos;
drop policy if exists "activos_admin_update" on public.activos;
drop policy if exists "activos_escritura_inventario" on public.activos;
drop policy if exists "activos_update_inventario" on public.activos;

create policy "activos_escritura_inventario"
on public.activos
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "activos_update_inventario"
on public.activos
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

-- ------------------------------------------------------------
-- 4. PERSONAS
-- ADMIN + INVENTARIO escriben.
-- ------------------------------------------------------------

drop policy if exists "personas_admin_insert" on public.personas;
drop policy if exists "personas_admin_update" on public.personas;
drop policy if exists "personas_inventario_insert" on public.personas;
drop policy if exists "personas_inventario_update" on public.personas;

create policy "personas_inventario_insert"
on public.personas
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "personas_inventario_update"
on public.personas
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

-- ------------------------------------------------------------
-- 5. CATÁLOGOS
-- ADMIN + INVENTARIO escriben.
-- ------------------------------------------------------------

drop policy if exists "tipos_activo_admin_insert" on public.tipos_activo;
drop policy if exists "tipos_activo_admin_update" on public.tipos_activo;
drop policy if exists "marcas_admin_insert" on public.marcas;
drop policy if exists "marcas_admin_update" on public.marcas;
drop policy if exists "dependencias_admin_insert" on public.dependencias;
drop policy if exists "dependencias_admin_update" on public.dependencias;

drop policy if exists "tipos_activo_inventario_insert" on public.tipos_activo;
drop policy if exists "tipos_activo_inventario_update" on public.tipos_activo;
drop policy if exists "marcas_inventario_insert" on public.marcas;
drop policy if exists "marcas_inventario_update" on public.marcas;
drop policy if exists "dependencias_inventario_insert" on public.dependencias;
drop policy if exists "dependencias_inventario_update" on public.dependencias;

create policy "tipos_activo_inventario_insert"
on public.tipos_activo
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "tipos_activo_inventario_update"
on public.tipos_activo
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "marcas_inventario_insert"
on public.marcas
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "marcas_inventario_update"
on public.marcas
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "dependencias_inventario_insert"
on public.dependencias
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

create policy "dependencias_inventario_update"
on public.dependencias
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

-- ------------------------------------------------------------
-- 6. MOVIMIENTOS
-- ADMIN + INVENTARIO.
-- ------------------------------------------------------------

drop policy if exists "movimientos_admin_insert" on public.movimientos_activo;
drop policy if exists "movimientos_inventario_insert" on public.movimientos_activo;

create policy "movimientos_inventario_insert"
on public.movimientos_activo
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ))
);

-- Reemplazamos función para aceptar ADMIN o INVENTARIO.

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
  if not public.tiene_rol_sigat(
    array['ADMIN','INVENTARIO']::public.rol_sigat[]
  ) then
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
  else
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

-- ------------------------------------------------------------
-- 7. MANTENIMIENTOS
-- ADMIN + TECNICO.
-- ------------------------------------------------------------

drop policy if exists "mantenimientos_admin_insert" on public.mantenimientos;
drop policy if exists "mantenimientos_admin_update" on public.mantenimientos;
drop policy if exists "mantenimientos_tecnico_insert" on public.mantenimientos;
drop policy if exists "mantenimientos_tecnico_update" on public.mantenimientos;

create policy "mantenimientos_tecnico_insert"
on public.mantenimientos
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
);

create policy "mantenimientos_tecnico_update"
on public.mantenimientos
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
);

-- ------------------------------------------------------------
-- 8. NOVEDADES
-- ADMIN + TECNICO.
-- ------------------------------------------------------------

drop policy if exists "novedades_admin_insert" on public.novedades;
drop policy if exists "novedades_admin_update" on public.novedades;
drop policy if exists "novedades_tecnico_insert" on public.novedades;
drop policy if exists "novedades_tecnico_update" on public.novedades;

create policy "novedades_tecnico_insert"
on public.novedades
for insert
to authenticated
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
);

create policy "novedades_tecnico_update"
on public.novedades
for update
to authenticated
using (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
)
with check (
  (select public.tiene_rol_sigat(
    array['ADMIN','TECNICO']::public.rol_sigat[]
  ))
);
