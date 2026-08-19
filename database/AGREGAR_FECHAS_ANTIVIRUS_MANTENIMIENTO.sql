-- SIGAT CMV - Fechas adicionales en Activos
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.activos
  add column if not exists fecha_inicio_licencia_antivirus date,
  add column if not exists fecha_ultimo_mantenimiento date;

comment on column public.activos.fecha_inicio_licencia_antivirus is
  'Fecha de inicio de la licencia del antivirus instalado en el activo.';

comment on column public.activos.fecha_ultimo_mantenimiento is
  'Fecha del último mantenimiento realizado al equipo.';
