-- ============================================================
-- SIGAT CMV
-- ETAPA 3 CORREGIDA
-- LOGIN VISIBLE MEDIANTE USUARIO + CONTRASEÑA
-- ============================================================

-- ------------------------------------------------------------
-- 1. TIPO DE ROL
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'rol_sigat'
  ) then
    create type public.rol_sigat as enum (
      'ADMIN',
      'TECNICO',
      'INVENTARIO',
      'CONSULTA'
    );
  end if;
end
$$;

-- ------------------------------------------------------------
-- 2. TABLA DE PERFILES
-- ------------------------------------------------------------

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id)
    on update cascade
    on delete cascade,

  usuario text not null unique,
  nombres text,
  apellidos text,

  rol public.rol_sigat not null default 'CONSULTA',
  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint perfiles_usuario_formato
    check (
      usuario = lower(usuario)
      and usuario ~ '^[a-z0-9._-]{3,40}$'
    )
);

alter table public.perfiles enable row level security;

-- ------------------------------------------------------------
-- 3. UPDATED_AT
-- ------------------------------------------------------------

drop trigger if exists perfiles_set_updated_at
  on public.perfiles;

create trigger perfiles_set_updated_at
before update on public.perfiles
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. CREACIÓN AUTOMÁTICA DEL PERFIL
-- El email técnico:
-- edward@sigat.local
-- genera el usuario:
-- edward
-- ------------------------------------------------------------

create or replace function public.handle_new_sigat_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario text;
begin
  v_usuario := lower(split_part(coalesce(new.email, ''), '@', 1));

  if v_usuario = '' then
    raise exception 'SIGAT CMV requiere un identificador técnico para crear el usuario.';
  end if;

  insert into public.perfiles (
    id,
    usuario,
    nombres,
    apellidos,
    rol,
    activo
  )
  values (
    new.id,
    v_usuario,
    coalesce(new.raw_user_meta_data ->> 'nombres', ''),
    coalesce(new.raw_user_meta_data ->> 'apellidos', ''),
    'CONSULTA'::public.rol_sigat,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sigat
  on auth.users;

create trigger on_auth_user_created_sigat
after insert on auth.users
for each row
execute function public.handle_new_sigat_user();

-- ------------------------------------------------------------
-- 5. CREAR PERFIL PARA USUARIOS AUTH EXISTENTES
-- ------------------------------------------------------------

insert into public.perfiles (
  id,
  usuario,
  nombres,
  apellidos,
  rol,
  activo
)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'nombres', ''),
  coalesce(u.raw_user_meta_data ->> 'apellidos', ''),
  'CONSULTA'::public.rol_sigat,
  true
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 6. FUNCIONES DE SEGURIDAD
-- ------------------------------------------------------------

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol = 'ADMIN'::public.rol_sigat
      and p.activo = true
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

create or replace function public.usuario_sigat_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo = true
  );
$$;

revoke all on function public.usuario_sigat_activo() from public;
grant execute on function public.usuario_sigat_activo() to authenticated;

-- ------------------------------------------------------------
-- 7. POLÍTICAS DE PERFILES
-- ------------------------------------------------------------

drop policy if exists "perfil_leer_propio"
  on public.perfiles;

create policy "perfil_leer_propio"
on public.perfiles
for select
to authenticated
using (
  id = auth.uid()
  or public.es_admin()
);

drop policy if exists "perfil_admin_actualizar"
  on public.perfiles;

create policy "perfil_admin_actualizar"
on public.perfiles
for update
to authenticated
using (public.es_admin())
with check (public.es_admin());

-- ------------------------------------------------------------
-- 8. RETIRAR POLÍTICA TEMPORAL DE ETAPA 2
-- ------------------------------------------------------------

drop policy if exists "tipos_activo_prueba_conexion"
  on public.tipos_activo;

-- ------------------------------------------------------------
-- 9. LECTURA PARA USUARIOS AUTENTICADOS Y ACTIVOS
-- ------------------------------------------------------------

drop policy if exists "tipos_activo_lectura_autenticada"
  on public.tipos_activo;

create policy "tipos_activo_lectura_autenticada"
on public.tipos_activo
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "marcas_lectura_autenticada"
  on public.marcas;

create policy "marcas_lectura_autenticada"
on public.marcas
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "sedes_lectura_autenticada"
  on public.sedes;

create policy "sedes_lectura_autenticada"
on public.sedes
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "dependencias_lectura_autenticada"
  on public.dependencias;

create policy "dependencias_lectura_autenticada"
on public.dependencias
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "ubicaciones_lectura_autenticada"
  on public.ubicaciones;

create policy "ubicaciones_lectura_autenticada"
on public.ubicaciones
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "personas_lectura_autenticada"
  on public.personas;

create policy "personas_lectura_autenticada"
on public.personas
for select
to authenticated
using (public.usuario_sigat_activo());

drop policy if exists "activos_lectura_autenticada"
  on public.activos;

create policy "activos_lectura_autenticada"
on public.activos
for select
to authenticated
using (public.usuario_sigat_activo());

-- ============================================================
-- FIN ETAPA 3 CORREGIDA
-- ============================================================
