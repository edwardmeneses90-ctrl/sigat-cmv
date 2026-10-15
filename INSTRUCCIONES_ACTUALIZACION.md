# Actualización de mantenimientos y hoja de vida

1. En el proyecto de Supabase, abre **SQL Editor** y ejecuta `database/MANTENIMIENTOS_PLANILLA_ESCANEADA.sql`.
2. Despliega la aplicación actualizada para habilitar el detalle, la edición y la carga de planillas PDF.
3. En **Mantenimientos**, haz clic en la placa para consultar el registro. Si tienes rol ADMIN o TECNICO, podrás editarlo y adjuntar o reemplazar el PDF.
4. En **Activos > Hoja de vida**, la planilla aparece en el historial del activo como **Ver planilla escaneada (PDF)**. El enlace se genera de forma privada al abrirlo.
5. En la barra superior, busca por placa, serial, modelo o nombre del equipo; selecciona un resultado para abrir directamente la hoja de vida del activo.

Los PDF se guardan en un bucket privado. La migración autoriza su lectura a usuarios activos, y su carga, reemplazo y eliminación a ADMIN y TECNICO. El límite configurado es de 20 MB por archivo.
