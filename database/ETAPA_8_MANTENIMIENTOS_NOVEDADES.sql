-- ============================================================
-- SIGAT CMV
-- ETAPA 8 - MANTENIMIENTOS Y NOVEDADES
-- ============================================================

-- ------------------------------------------------------------
-- 1. MANTENIMIENTOS
-- ------------------------------------------------------------

create table if not exists public.mantenimientos (
  id uuid primary key default gen_random_uuid(),

  activo_id uuid not null references public.activos(id)
    on update cascade
    on delete restrict,

  tipo text not null
    check (tipo in ('PREVENTIVO', 'CORRECTIVO')),

  fecha_mantenimiento date not null default current_date,

  tecnico_proveedor text,
  diagnostico text,
  trabajo_realizado text,
  repuestos text,
  costo numeric(14,2),
  proximo_mantenimiento date,
  observaciones text,

  registrado_por uuid references public.perfiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_mantenimientos_activo
on public.mantenimientos(activo_id);

create index if not exists idx_mantenimientos_fecha
on public.mantenimientos(fecha_mantenimiento desc);

alter table public.mantenimientos enable row level security;

drop policy if exists "mantenimientos_lectura"
on public.mantenimientos;

create policy "mantenimientos_lectura"
on public.mantenimientos
for select
to authenticated
using (
  public.usuario_sigat_activo()
);

drop policy if exists "mantenimientos_admin_insert"
on public.mantenimientos;

create policy "mantenimientos_admin_insert"
on public.mantenimientos
for insert
to authenticated
with check (
  (select public.es_admin())
);

drop policy if exists "mantenimientos_admin_update"
on public.mantenimientos;

create policy "mantenimientos_admin_update"
on public.mantenimientos
for update
to authenticated
using (
  (select public.es_admin())
)
with check (
  (select public.es_admin())
);

-- ------------------------------------------------------------
-- 2. NOVEDADES
-- ------------------------------------------------------------

create table if not exists public.novedades (
  id uuid primary key default gen_random_uuid(),

  activo_id uuid not null references public.activos(id)
    on update cascade
    on delete restrict,

  tipo text not null
    check (
      tipo in (
        'FALLA',
        'DANO',
        'GARANTIA',
        'PERDIDA',
        'HURTO',
        'PRESTAMO',
        'DEVOLUCION',
        'CAMBIO_COMPONENTE',
        'OTRO'
      )
    ),

  fecha_novedad timestamptz not null default now(),

  descripcion text not null,
  observaciones text,

  registrado_por uuid references public.perfiles(id)
    on update cascade
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_novedades_activo
on public.novedades(activo_id);

create index if not exists idx_novedades_fecha
on public.novedades(fecha_novedad desc);

alter table public.novedades enable row level security;

drop policy if exists "novedades_lectura"
on public.novedades;

create policy "novedades_lectura"
on public.novedades
for select
to authenticated
using (
  public.usuario_sigat_activo()
);

drop policy if exists "novedades_admin_insert"
on public.novedades;

create policy "novedades_admin_insert"
on public.novedades
for insert
to authenticated
with check (
  (select public.es_admin())
);

drop policy if exists "novedades_admin_update"
on public.novedades;

create policy "novedades_admin_update"
on public.novedades
for update
to authenticated
using (
  (select public.es_admin())
)
with check (
  (select public.es_admin())
);
