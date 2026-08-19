-- ============================================================
-- SIGAT CMV
-- ETAPA 6 - ACTIVOS
-- ============================================================

-- Permisos de escritura para ADMIN.

drop policy if exists "activos_admin_insert"
on public.activos;

create policy "activos_admin_insert"
on public.activos
for insert
to authenticated
with check (
  (select public.es_admin())
);

drop policy if exists "activos_admin_update"
on public.activos;

create policy "activos_admin_update"
on public.activos
for update
to authenticated
using (
  (select public.es_admin())
)
with check (
  (select public.es_admin())
);

-- No habilitamos DELETE.
-- Los activos deben conservarse para trazabilidad.

-- Índices adicionales para búsquedas frecuentes.

create index if not exists idx_activos_codigo_lower
on public.activos (lower(codigo));

create index if not exists idx_activos_serial_lower
on public.activos (lower(serial));

create index if not exists idx_activos_modelo_lower
on public.activos (lower(modelo));
