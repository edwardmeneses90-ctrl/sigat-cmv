-- SIGAT CMV - Nuevos campos técnicos del activo
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.activos
  add column if not exists monitor text,
  add column if not exists tarjeta_grafica text,
  add column if not exists otros_componentes text,
  add column if not exists licencia_sistema_operativo text,
  add column if not exists suite_oficina text,
  add column if not exists antivirus text,
  add column if not exists otro_software text;
