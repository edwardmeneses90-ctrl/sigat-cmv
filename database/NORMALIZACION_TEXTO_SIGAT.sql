-- =====================================================================
-- SIGAT CMV - NORMALIZACIÓN ESTÉTICA DE NOMBRES Y TÍTULOS
-- =====================================================================
--
-- OBJETIVO:
-- Evitar registros como:
--   IMPRESORA  -> Impresora
--   ALVARO     -> Alvaro
--   JUAN CARLOS PEREZ -> Juan Carlos Perez
--
-- Se normalizan únicamente campos "humanos" o descriptivos cortos.
--
-- NO SE MODIFICAN:
--   - usuarios
--   - contraseñas
--   - correos
--   - identificaciones
--   - placas/códigos
--   - seriales
--   - modelos
--   - IP
--   - MAC
--   - números de ticket
--
-- También se preservan siglas técnicas frecuentes:
-- TIC, CMV, PC, CPU, RAM, SSD, HDD, USB, UPS, IP, MAC, HP, IBM, LG
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. FUNCIÓN PRINCIPAL
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_titulo(
  p_texto text
)
returns text
language plpgsql
immutable
as $$
declare
  v_texto text;
  v_palabras text[];
  v_resultado text := '';
  v_palabra text;
  v_i integer;
  v_siglas text[] := array[
    'tic',
    'cmv',
    'pc',
    'cpu',
    'ram',
    'ssd',
    'hdd',
    'usb',
    'ups',
    'ip',
    'mac',
    'hp',
    'ibm',
    'lg'
  ];
  v_conectores text[] := array[
    'de',
    'del',
    'la',
    'las',
    'los',
    'y',
    'e'
  ];
begin
  if p_texto is null then
    return null;
  end if;

  -- Elimina espacios sobrantes y unifica a minúsculas.
  v_texto := lower(
    regexp_replace(
      trim(p_texto),
      '\s+',
      ' ',
      'g'
    )
  );

  if v_texto = '' then
    return '';
  end if;

  v_palabras := string_to_array(v_texto, ' ');

  for v_i in 1..array_length(v_palabras, 1)
  loop
    v_palabra := v_palabras[v_i];

    -- Siglas técnicas conocidas permanecen en MAYÚSCULA.
    if v_palabra = any(v_siglas) then
      v_palabra := upper(v_palabra);

    -- Conectores españoles quedan en minúscula,
    -- excepto cuando son la primera palabra.
    elsif v_i > 1 and v_palabra = any(v_conectores) then
      v_palabra := v_palabra;

    else
      v_palabra :=
        upper(left(v_palabra, 1)) ||
        substring(v_palabra from 2);
    end if;

    if v_resultado <> '' then
      v_resultado := v_resultado || ' ';
    end if;

    v_resultado := v_resultado || v_palabra;
  end loop;

  return v_resultado;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. PERFILES / USUARIOS DEL SISTEMA
--    Solo nombres y apellidos. "usuario" NO se modifica.
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_perfiles()
returns trigger
language plpgsql
as $$
begin
  new.nombres :=
    public.sigat_normalizar_titulo(new.nombres);

  new.apellidos :=
    public.sigat_normalizar_titulo(new.apellidos);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_perfiles
on public.perfiles;

create trigger trg_sigat_normalizar_perfiles
before insert or update
on public.perfiles
for each row
execute function public.sigat_normalizar_perfiles();


-- ---------------------------------------------------------------------
-- 3. PERSONAS
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_personas()
returns trigger
language plpgsql
as $$
begin
  new.nombres :=
    public.sigat_normalizar_titulo(new.nombres);

  new.apellidos :=
    public.sigat_normalizar_titulo(new.apellidos);

  new.cargo :=
    public.sigat_normalizar_titulo(new.cargo);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_personas
on public.personas;

create trigger trg_sigat_normalizar_personas
before insert or update
on public.personas
for each row
execute function public.sigat_normalizar_personas();


-- ---------------------------------------------------------------------
-- 4. TIPOS DE ACTIVO
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_tipos_activo()
returns trigger
language plpgsql
as $$
begin
  new.nombre :=
    public.sigat_normalizar_titulo(new.nombre);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_tipos_activo
on public.tipos_activo;

create trigger trg_sigat_normalizar_tipos_activo
before insert or update
on public.tipos_activo
for each row
execute function public.sigat_normalizar_tipos_activo();


-- ---------------------------------------------------------------------
-- 5. MARCAS
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_marcas()
returns trigger
language plpgsql
as $$
begin
  new.nombre :=
    public.sigat_normalizar_titulo(new.nombre);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_marcas
on public.marcas;

create trigger trg_sigat_normalizar_marcas
before insert or update
on public.marcas
for each row
execute function public.sigat_normalizar_marcas();


-- ---------------------------------------------------------------------
-- 6. DEPENDENCIAS
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_dependencias()
returns trigger
language plpgsql
as $$
begin
  new.nombre :=
    public.sigat_normalizar_titulo(new.nombre);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_dependencias
on public.dependencias;

create trigger trg_sigat_normalizar_dependencias
before insert or update
on public.dependencias
for each row
execute function public.sigat_normalizar_dependencias();


-- ---------------------------------------------------------------------
-- 7. ACTIVOS
--    Solo nombre del equipo y proveedor.
--    Modelo, serial y placa NO se modifican.
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_activos()
returns trigger
language plpgsql
as $$
begin
  new.nombre_equipo :=
    public.sigat_normalizar_titulo(new.nombre_equipo);

  new.proveedor :=
    public.sigat_normalizar_titulo(new.proveedor);

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_activos
on public.activos;

create trigger trg_sigat_normalizar_activos
before insert or update
on public.activos
for each row
execute function public.sigat_normalizar_activos();


-- ---------------------------------------------------------------------
-- 8. SOLICITUDES / TICKETS
--    Normaliza snapshots y asunto.
--    La descripción libre NO se modifica.
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_solicitudes()
returns trigger
language plpgsql
as $$
begin
  new.solicitante_nombre :=
    public.sigat_normalizar_titulo(
      new.solicitante_nombre
    );

  new.dependencia_nombre :=
    public.sigat_normalizar_titulo(
      new.dependencia_nombre
    );

  new.asunto :=
    public.sigat_normalizar_titulo(
      new.asunto
    );

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_solicitudes
on public.solicitudes_servicio;

create trigger trg_sigat_normalizar_solicitudes
before insert or update
on public.solicitudes_servicio
for each row
execute function public.sigat_normalizar_solicitudes();


-- ---------------------------------------------------------------------
-- 9. SOPORTES TÉCNICOS
--    Solo nombres históricos.
--    Actividad realizada y observaciones NO se modifican.
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_soportes()
returns trigger
language plpgsql
as $$
begin
  new.dependencia_nombre :=
    public.sigat_normalizar_titulo(
      new.dependencia_nombre
    );

  new.tecnico_nombre :=
    public.sigat_normalizar_titulo(
      new.tecnico_nombre
    );

  new.solicitante_nombre :=
    public.sigat_normalizar_titulo(
      new.solicitante_nombre
    );

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_soportes
on public.soportes_tecnicos;

create trigger trg_sigat_normalizar_soportes
before insert or update
on public.soportes_tecnicos
for each row
execute function public.sigat_normalizar_soportes();


-- ---------------------------------------------------------------------
-- 10. CONCEPTOS DE BAJA
--     Normaliza únicamente datos cortos de presentación.
-- ---------------------------------------------------------------------

create or replace function public.sigat_normalizar_conceptos_baja()
returns trigger
language plpgsql
as $$
begin
  new.tipo_equipo :=
    public.sigat_normalizar_titulo(
      new.tipo_equipo
    );

  new.asignado_a :=
    public.sigat_normalizar_titulo(
      new.asignado_a
    );

  new.dependencia :=
    public.sigat_normalizar_titulo(
      new.dependencia
    );

  new.tecnico_nombre :=
    public.sigat_normalizar_titulo(
      new.tecnico_nombre
    );

  new.tecnico_cargo :=
    public.sigat_normalizar_titulo(
      new.tecnico_cargo
    );

  new.tecnico_area :=
    public.sigat_normalizar_titulo(
      new.tecnico_area
    );

  return new;
end;
$$;

drop trigger if exists trg_sigat_normalizar_conceptos_baja
on public.conceptos_baja;

create trigger trg_sigat_normalizar_conceptos_baja
before insert or update
on public.conceptos_baja
for each row
execute function public.sigat_normalizar_conceptos_baja();


-- =====================================================================
-- 11. NORMALIZAR DATOS YA EXISTENTES
-- =====================================================================
-- Al hacer UPDATE, los triggers recién creados normalizan los valores.
-- No afecta placas, seriales, identificaciones ni credenciales.
-- =====================================================================

update public.perfiles
set nombres = nombres
where nombres is not null
   or apellidos is not null;

update public.personas
set nombres = nombres
where nombres is not null
   or apellidos is not null
   or cargo is not null;

update public.tipos_activo
set nombre = nombre;

update public.marcas
set nombre = nombre;

update public.dependencias
set nombre = nombre;

update public.activos
set nombre_equipo = nombre_equipo
where nombre_equipo is not null
   or proveedor is not null;

update public.solicitudes_servicio
set asunto = asunto
where solicitante_nombre is not null
   or dependencia_nombre is not null
   or asunto is not null;

update public.soportes_tecnicos
set tecnico_nombre = tecnico_nombre
where dependencia_nombre is not null
   or tecnico_nombre is not null
   or solicitante_nombre is not null;

update public.conceptos_baja
set tecnico_nombre = tecnico_nombre
where tipo_equipo is not null
   or asignado_a is not null
   or dependencia is not null
   or tecnico_nombre is not null;


-- =====================================================================
-- 12. PRUEBA RÁPIDA DE LA FUNCIÓN
-- =====================================================================

select
  public.sigat_normalizar_titulo(
    'IMPRESORA'
  ) as ejemplo_1,

  public.sigat_normalizar_titulo(
    'ALVARO PEREZ'
  ) as ejemplo_2,

  public.sigat_normalizar_titulo(
    'SECRETARIA DE GESTION TIC'
  ) as ejemplo_3,

  public.sigat_normalizar_titulo(
    'PC HP'
  ) as ejemplo_4;


-- RESULTADO ESPERADO:
--
-- Impresora
-- Alvaro Perez
-- Secretaria de Gestion TIC
-- PC HP
-- =====================================================================
