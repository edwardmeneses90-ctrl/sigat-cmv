-- ============================================================
-- SIGAT CMV - MODULO DE SOPORTES TECNICOS DIARIOS
-- Basado en FOR-GESTIC-10 V1
-- ============================================================

create table if not exists public.soportes_tecnicos (
  id uuid primary key default gen_random_uuid(),

  fecha date not null default current_date,

  tipo_soporte text not null,
  actividad_realizada text not null,

  dependencia_id uuid null
    references public.dependencias(id)
    on update cascade
    on delete restrict,

  tecnico_id uuid null
    references public.personas(id)
    on update cascade
    on delete restrict,

  solicitante_id uuid null
    references public.personas(id)
    on update cascade
    on delete restrict,

  -- Copias de texto para preservar el histórico incluso si luego
  -- cambia el nombre/cargo/dependencia de una persona.
  dependencia_nombre text null,
  tecnico_nombre text not null,
  solicitante_nombre text not null,

  -- Integración opcional con inventario.
  -- No forma parte del formato impreso FOR-GESTIC-10.
  activo_id uuid null
    references public.activos(id)
    on update cascade
    on delete restrict,

  observaciones text null,

  anulado boolean not null default false,
  motivo_anulacion text null,

  registrado_por uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_soportes_tecnicos_fecha
  on public.soportes_tecnicos(fecha desc);

create index if not exists idx_soportes_tecnicos_dependencia
  on public.soportes_tecnicos(dependencia_id);

create index if not exists idx_soportes_tecnicos_tecnico
  on public.soportes_tecnicos(tecnico_id);

create index if not exists idx_soportes_tecnicos_solicitante
  on public.soportes_tecnicos(solicitante_id);

create index if not exists idx_soportes_tecnicos_activo
  on public.soportes_tecnicos(activo_id);

create or replace function public.set_updated_at_soportes()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_soportes_tecnicos_updated_at
on public.soportes_tecnicos;

create trigger trg_soportes_tecnicos_updated_at
before update on public.soportes_tecnicos
for each row
execute function public.set_updated_at_soportes();

alter table public.soportes_tecnicos enable row level security;

drop policy if exists "soportes_select_autenticados"
  on public.soportes_tecnicos;

create policy "soportes_select_autenticados"
on public.soportes_tecnicos
for select
to authenticated
using (true);

drop policy if exists "soportes_insert_admin_tecnico"
  on public.soportes_tecnicos;

create policy "soportes_insert_admin_tecnico"
on public.soportes_tecnicos
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

drop policy if exists "soportes_update_admin_tecnico"
  on public.soportes_tecnicos;

create policy "soportes_update_admin_tecnico"
on public.soportes_tecnicos
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

-- No se crea política DELETE.
-- Los soportes forman parte del histórico institucional.
-- Si hay un error se ANULA el registro, no se elimina físicamente.
