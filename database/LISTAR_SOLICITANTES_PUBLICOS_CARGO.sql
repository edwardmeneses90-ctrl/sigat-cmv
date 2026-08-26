create or replace function public.listar_solicitantes_publicos()
returns table (
  id uuid,
  nombre text,
  dependencia text,
  cargo text
)
language sql
security definer
as $$
  select
    p.id,
    trim(concat(coalesce(p.nombres,''),' ',coalesce(p.apellidos,''))) as nombre,
    d.nombre as dependencia,
    p.cargo
  from public.personas p
  left join public.dependencias d
    on d.id = p.dependencia_id
  where p.activo = true
  order by nombre;
$$;
