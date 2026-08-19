-- ============================================================
-- SIGAT CMV - ALERTAS
-- Automatización de fecha del último mantenimiento
-- ============================================================

-- Esta función mantiene activos.fecha_ultimo_mantenimiento
-- sincronizada con la fecha más reciente registrada en mantenimientos.

create or replace function public.sincronizar_fecha_ultimo_mantenimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
begin
  select max(m.fecha_mantenimiento)
  into v_fecha
  from public.mantenimientos m
  where m.activo_id = new.activo_id;

  update public.activos
  set fecha_ultimo_mantenimiento = v_fecha
  where id = new.activo_id;

  -- Si una edición mueve el mantenimiento a otro activo,
  -- recalculamos también el activo anterior.
  if tg_op = 'UPDATE'
     and old.activo_id is distinct from new.activo_id then

    select max(m.fecha_mantenimiento)
    into v_fecha
    from public.mantenimientos m
    where m.activo_id = old.activo_id;

    update public.activos
    set fecha_ultimo_mantenimiento = v_fecha
    where id = old.activo_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sincronizar_fecha_ultimo_mantenimiento
on public.mantenimientos;

create trigger trg_sincronizar_fecha_ultimo_mantenimiento
after insert or update of fecha_mantenimiento, activo_id
on public.mantenimientos
for each row
execute function public.sincronizar_fecha_ultimo_mantenimiento();

-- Sincronización inicial con mantenimientos ya existentes.
update public.activos a
set fecha_ultimo_mantenimiento = x.fecha
from (
  select
    activo_id,
    max(fecha_mantenimiento) as fecha
  from public.mantenimientos
  group by activo_id
) x
where a.id = x.activo_id;
