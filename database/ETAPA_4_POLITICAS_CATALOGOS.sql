-- ============================================================
-- SIGAT CMV
-- ETAPA 4 - POLÍTICAS DE ESCRITURA PARA CATÁLOGOS
-- SOLO ADMIN PUEDE CREAR Y EDITAR
-- ============================================================

-- TIPOS DE ACTIVO
drop policy if exists "tipos_activo_admin_insert"
  on public.tipos_activo;

create policy "tipos_activo_admin_insert"
on public.tipos_activo
for insert
to authenticated
with check (public.es_admin());

drop policy if exists "tipos_activo_admin_update"
  on public.tipos_activo;

create policy "tipos_activo_admin_update"
on public.tipos_activo
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- MARCAS
drop policy if exists "marcas_admin_insert"
  on public.marcas;

create policy "marcas_admin_insert"
on public.marcas
for insert
to authenticated
with check (public.es_admin());

drop policy if exists "marcas_admin_update"
  on public.marcas;

create policy "marcas_admin_update"
on public.marcas
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- SEDES
drop policy if exists "sedes_admin_insert"
  on public.sedes;

create policy "sedes_admin_insert"
on public.sedes
for insert
to authenticated
with check (public.es_admin());

drop policy if exists "sedes_admin_update"
  on public.sedes;

create policy "sedes_admin_update"
on public.sedes
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- DEPENDENCIAS
drop policy if exists "dependencias_admin_insert"
  on public.dependencias;

create policy "dependencias_admin_insert"
on public.dependencias
for insert
to authenticated
with check (public.es_admin());

drop policy if exists "dependencias_admin_update"
  on public.dependencias;

create policy "dependencias_admin_update"
on public.dependencias
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- UBICACIONES
drop policy if exists "ubicaciones_admin_insert"
  on public.ubicaciones;

create policy "ubicaciones_admin_insert"
on public.ubicaciones
for insert
to authenticated
with check (public.es_admin());

drop policy if exists "ubicaciones_admin_update"
  on public.ubicaciones;

create policy "ubicaciones_admin_update"
on public.ubicaciones
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- NOTA:
-- En esta etapa no habilitamos DELETE.
-- Los catálogos se desactivan con activo = false.
