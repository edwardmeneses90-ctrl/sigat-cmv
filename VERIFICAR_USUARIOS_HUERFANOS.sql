-- VERIFICACIÓN DE USUARIOS HUÉRFANOS
-- No modifica datos.
-- Muestra usuarios de Authentication sin perfil SIGAT.

select
  u.id,
  u.email,
  u.created_at
from auth.users u
left join public.perfiles p
  on p.id = u.id
where p.id is null
order by u.created_at desc;
