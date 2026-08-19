-- ============================================================
-- SIGAT CMV - MODULO CONCEPTOS TECNICOS DE BAJA
-- ============================================================

create table if not exists public.conceptos_baja (
  id uuid primary key default gen_random_uuid(),

  activo_id uuid not null
    references public.activos(id)
    on update cascade
    on delete restrict,

  fecha date not null default current_date,

  destinatario_nombre text not null default 'GERALDINE ROJAS',
  destinatario_oficina text not null default 'Oficina de Recursos Físicos',
  destinatario_entidad text not null default 'Concejo Municipal de Villavicencio',
  referencia text not null default 'Concepto Técnico De Evaluación Y Diagnóstico De Equipo De Cómputo',

  -- Snapshot de los datos del activo para conservar el documento histórico
  tipo_equipo text null,
  asignado_a text null,
  dependencia text null,
  placa_inventario text not null,
  marca text null,
  modelo text null,
  numero_serie text null,

  antecedentes_descripcion_falla text null,
  inspeccion_mantenimiento_correctivo text null,
  diagnostico_conclusiones text null,
  recomendacion_concepto text null,
  nota_seguridad_informacion text null,

  tecnico_id uuid null
    references public.personas(id)
    on update cascade
    on delete restrict,

  tecnico_nombre text not null,
  tecnico_cargo text null,
  tecnico_area text null default 'Comunicaciones y Prensa',
  tecnico_telefono text null,
  tecnico_correo text null,

  anulado boolean not null default false,
  motivo_anulacion text null,

  registrado_por uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conceptos_baja_activo
  on public.conceptos_baja(activo_id);

create index if not exists idx_conceptos_baja_fecha
  on public.conceptos_baja(fecha desc);

create index if not exists idx_conceptos_baja_tecnico
  on public.conceptos_baja(tecnico_id);

create or replace function public.set_updated_at_conceptos_baja()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_conceptos_baja_updated_at
on public.conceptos_baja;

create trigger trg_conceptos_baja_updated_at
before update on public.conceptos_baja
for each row
execute function public.set_updated_at_conceptos_baja();

alter table public.conceptos_baja enable row level security;

drop policy if exists "conceptos_baja_select_authenticated"
  on public.conceptos_baja;

create policy "conceptos_baja_select_authenticated"
on public.conceptos_baja
for select
to authenticated
using (true);

drop policy if exists "conceptos_baja_insert_admin_tecnico"
  on public.conceptos_baja;

create policy "conceptos_baja_insert_admin_tecnico"
on public.conceptos_baja
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN', 'TECNICO')
  )
);

drop policy if exists "conceptos_baja_update_admin_tecnico"
  on public.conceptos_baja;

create policy "conceptos_baja_update_admin_tecnico"
on public.conceptos_baja
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN', 'TECNICO')
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol::text in ('ADMIN', 'TECNICO')
  )
);

-- No existe política DELETE.
-- El concepto se anula pero no se elimina para conservar trazabilidad.
