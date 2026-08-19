-- ============================================================
-- SIGAT CMV
-- ETAPA 2 - BASE DE DATOS INICIAL
-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. TIPOS DE ACTIVO
-- ------------------------------------------------------------

create table if not exists public.tipos_activo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  prefijo text not null unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. MARCAS
-- ------------------------------------------------------------

create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. SEDES
-- ------------------------------------------------------------

create table if not exists public.sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  direccion text,
  ciudad text,
  observaciones text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. DEPENDENCIAS
-- ------------------------------------------------------------

create table if not exists public.dependencias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  codigo text unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. UBICACIONES
-- ------------------------------------------------------------

create table if not exists public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id)
    on update cascade
    on delete restrict,
  nombre text not null,
  edificio text,
  piso text,
  oficina text,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sede_id, nombre)
);

-- ------------------------------------------------------------
-- 6. PERSONAS
-- ------------------------------------------------------------

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  identificacion text unique,
  nombres text not null,
  apellidos text not null,
  correo text,
  telefono text,
  cargo text,
  dependencia_id uuid references public.dependencias(id)
    on update cascade
    on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. ACTIVOS
-- ------------------------------------------------------------

create table if not exists public.activos (
  id uuid primary key default gen_random_uuid(),

  codigo text not null unique,
  tipo_activo_id uuid not null references public.tipos_activo(id)
    on update cascade
    on delete restrict,

  marca_id uuid references public.marcas(id)
    on update cascade
    on delete set null,

  modelo text,
  serial text unique,

  nombre_equipo text,

  procesador text,
  memoria_ram text,
  almacenamiento text,
  sistema_operativo text,
  direccion_ip inet,
  direccion_mac macaddr,

  fecha_compra date,
  proveedor text,
  numero_factura text,
  valor_compra numeric(14,2),
  fecha_fin_garantia date,

  estado text not null default 'DISPONIBLE'
    check (
      estado in (
        'DISPONIBLE',
        'ASIGNADO',
        'EN_MANTENIMIENTO',
        'EN_GARANTIA',
        'EN_PRESTAMO',
        'PENDIENTE_BAJA',
        'DADO_DE_BAJA',
        'PERDIDO',
        'HURTADO'
      )
    ),

  ubicacion_id uuid references public.ubicaciones(id)
    on update cascade
    on delete set null,

  dependencia_id uuid references public.dependencias(id)
    on update cascade
    on delete set null,

  responsable_id uuid references public.personas(id)
    on update cascade
    on delete set null,

  observaciones text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. ÍNDICES
-- ------------------------------------------------------------

create index if not exists idx_activos_tipo
  on public.activos(tipo_activo_id);

create index if not exists idx_activos_marca
  on public.activos(marca_id);

create index if not exists idx_activos_estado
  on public.activos(estado);

create index if not exists idx_activos_ubicacion
  on public.activos(ubicacion_id);

create index if not exists idx_activos_dependencia
  on public.activos(dependencia_id);

create index if not exists idx_activos_responsable
  on public.activos(responsable_id);

create index if not exists idx_personas_dependencia
  on public.personas(dependencia_id);

create index if not exists idx_ubicaciones_sede
  on public.ubicaciones(sede_id);

-- ------------------------------------------------------------
-- 9. UPDATED_AT AUTOMÁTICO
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activos_set_updated_at
  on public.activos;

create trigger activos_set_updated_at
before update on public.activos
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.tipos_activo enable row level security;
alter table public.marcas enable row level security;
alter table public.sedes enable row level security;
alter table public.dependencias enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.personas enable row level security;
alter table public.activos enable row level security;

-- Política TEMPORAL y mínima.
-- Únicamente permite leer tipos_activo para validar la conexión
-- antes de construir autenticación en la siguiente etapa.

drop policy if exists "tipos_activo_prueba_conexion"
  on public.tipos_activo;

create policy "tipos_activo_prueba_conexion"
on public.tipos_activo
for select
to anon, authenticated
using (true);

-- ------------------------------------------------------------
-- 11. DATOS INICIALES
-- ------------------------------------------------------------

insert into public.tipos_activo (nombre, prefijo, descripcion)
values
  ('Computador de escritorio', 'PC', 'Equipo de cómputo de escritorio'),
  ('Portátil', 'POR', 'Equipo de cómputo portátil'),
  ('Monitor', 'MON', 'Monitor o pantalla'),
  ('Impresora', 'IMP', 'Equipo de impresión'),
  ('Escáner', 'ESC', 'Equipo de digitalización'),
  ('Servidor', 'SRV', 'Servidor físico'),
  ('Switch', 'SWT', 'Switch de red'),
  ('Router', 'RTR', 'Router de red'),
  ('Access Point', 'AP', 'Punto de acceso inalámbrico'),
  ('UPS', 'UPS', 'Sistema de alimentación ininterrumpida'),
  ('Tablet', 'TAB', 'Dispositivo tipo tablet'),
  ('Celular', 'CEL', 'Teléfono móvil institucional'),
  ('Proyector', 'PRO', 'Equipo de proyección'),
  ('Cámara', 'CAM', 'Cámara tecnológica'),
  ('Disco externo', 'DEX', 'Unidad de almacenamiento externa'),
  ('Teclado', 'TEC', 'Teclado'),
  ('Mouse', 'MOU', 'Dispositivo apuntador'),
  ('Otro', 'OTR', 'Otro activo tecnológico')
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- FIN ETAPA 2
-- ------------------------------------------------------------
