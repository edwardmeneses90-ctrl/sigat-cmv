-- ============================================================
-- SIGAT CMV
-- CONVERTIR USUARIO EN ADMIN
-- ============================================================

-- CAMBIA:
-- TU_USUARIO
--
-- EJEMPLO:
-- edward

update public.perfiles
set rol = 'ADMIN'::public.rol_sigat
where usuario = lower('TU_USUARIO');

-- COMPROBACIÓN
select
  usuario,
  nombres,
  apellidos,
  rol,
  activo
from public.perfiles
where usuario = lower('TU_USUARIO');
