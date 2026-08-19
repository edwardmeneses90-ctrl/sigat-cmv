-- ============================================================
-- SIGAT CMV
-- ETAPA 5 - POLÍTICAS PARA PERSONAS
-- ============================================================

drop policy if exists "personas_admin_insert"
on public.personas;

create policy "personas_admin_insert"
on public.personas
for insert
to authenticated
with check (
  (select public.es_admin())
);

drop policy if exists "personas_admin_update"
on public.personas;

create policy "personas_admin_update"
on public.personas
for update
to authenticated
using (
  (select public.es_admin())
)
with check (
  (select public.es_admin())
);

-- No habilitamos DELETE.
