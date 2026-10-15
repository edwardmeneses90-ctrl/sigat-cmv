-- SIGAT CMV - Adjuntar planillas escaneadas a los mantenimientos.
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.mantenimientos
  add column if not exists archivo_pdf text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sigat-mantenimientos', 'sigat-mantenimientos', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf'];

drop policy if exists "sigat_mantenimientos_pdf_lectura" on storage.objects;
create policy "sigat_mantenimientos_pdf_lectura"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sigat-mantenimientos'
  and public.usuario_sigat_activo()
);

drop policy if exists "sigat_mantenimientos_pdf_insert" on storage.objects;
create policy "sigat_mantenimientos_pdf_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sigat-mantenimientos'
  and (select public.tiene_rol_sigat(array['ADMIN','TECNICO']::public.rol_sigat[]))
);

drop policy if exists "sigat_mantenimientos_pdf_update" on storage.objects;
create policy "sigat_mantenimientos_pdf_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'sigat-mantenimientos'
  and (select public.tiene_rol_sigat(array['ADMIN','TECNICO']::public.rol_sigat[]))
)
with check (
  bucket_id = 'sigat-mantenimientos'
  and (select public.tiene_rol_sigat(array['ADMIN','TECNICO']::public.rol_sigat[]))
);

drop policy if exists "sigat_mantenimientos_pdf_delete" on storage.objects;
create policy "sigat_mantenimientos_pdf_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sigat-mantenimientos'
  and (select public.tiene_rol_sigat(array['ADMIN','TECNICO']::public.rol_sigat[]))
);
