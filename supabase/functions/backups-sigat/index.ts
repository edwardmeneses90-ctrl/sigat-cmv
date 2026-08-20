import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "configuracion_sigat",
  "dependencias",
  "tipos_activo",
  "marcas",
  "personas",
  "activos",
  "movimientos_activo",
  "solicitudes_servicio",
  "mantenimientos",
  "soportes_tecnicos",
  "conceptos_baja",
];

const DELETE_ORDER = [
  "conceptos_baja",
  "soportes_tecnicos",
  "mantenimientos",
  "movimientos_activo",
  "solicitudes_servicio",
  "activos",
  "personas",
  "marcas",
  "tipos_activo",
  "dependencias",
];

const INSERT_ORDER = [
  "dependencias",
  "tipos_activo",
  "marcas",
  "personas",
  "activos",
  "movimientos_activo",
  "solicitudes_servicio",
  "mantenimientos",
  "soportes_tecnicos",
  "conceptos_baja",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) return json({ ok: false, error: "Sesión requerida" }, 401);

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData.user) return json({ ok: false, error: "Sesión inválida" }, 401);

    const { data: perfil, error: perfilError } = await admin
      .from("perfiles")
      .select("usuario, rol, activo")
      .eq("id", userData.user.id)
      .single();

    if (perfilError || perfil?.rol !== "ADMIN" || perfil?.activo !== true) {
      return json({ ok: false, error: "Solo ADMIN puede administrar copias de seguridad" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "create") return await createBackup(admin, userData.user.id, perfil.usuario);
    if (action === "download") return await downloadBackup(admin, body.backup_id);
    if (action === "restore") return await restoreBackup(admin, body.backup_id, userData.user.id);

    return json({ ok: false, error: "Acción no válida" }, 400);
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error?.message || "Error inesperado" }, 500);
  }
});

async function createBackup(admin: any, userId: string, usuario: string) {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const path = `manual/SIGAT-CMV-${stamp}.json`;

  const { data: meta, error: metaError } = await admin
    .from("backups_sigat")
    .insert({
      archivo: path,
      estado: "CREANDO",
      tipo: "MANUAL",
      creado_por: userId,
      creado_por_usuario: usuario || "admin",
    })
    .select("id")
    .single();

  if (metaError) throw metaError;

  try {
    const data: Record<string, unknown[]> = {};
    let total = 0;

    for (const table of TABLES) {
      data[table] = await fetchAll(admin, table);
      total += data[table].length;
    }

    const payload = {
      app: "SIGAT CMV",
      format_version: 1,
      created_at: new Date().toISOString(),
      created_by: usuario || "admin",
      tables: data,
    };

    const text = JSON.stringify(payload, null, 2);
    const bytes = new TextEncoder().encode(text).byteLength;

    const { error: uploadError } = await admin.storage
      .from("sigat-backups")
      .upload(path, new Blob([text], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    await admin
      .from("backups_sigat")
      .update({
        estado: "CREADO",
        tamano_bytes: bytes,
        total_registros: total,
        ultimo_error: null,
      })
      .eq("id", meta.id);

    return json({ ok: true, backup_id: meta.id });
  } catch (error) {
    await admin
      .from("backups_sigat")
      .update({ estado: "ERROR", ultimo_error: error?.message || String(error) })
      .eq("id", meta.id);
    throw error;
  }
}

async function downloadBackup(admin: any, backupId: string) {
  if (!backupId) return json({ ok: false, error: "backup_id requerido" }, 400);

  const { data: meta, error } = await admin
    .from("backups_sigat")
    .select("archivo, estado")
    .eq("id", backupId)
    .single();

  if (error) throw error;
  if (meta.estado !== "CREADO" && meta.estado !== "RESTAURADO") {
    return json({ ok: false, error: "La copia no está disponible para descarga" }, 409);
  }

  const { data, error: signedError } = await admin.storage
    .from("sigat-backups")
    .createSignedUrl(meta.archivo, 120);

  if (signedError) throw signedError;
  return json({ ok: true, url: data.signedUrl });
}

async function restoreBackup(admin: any, backupId: string, userId: string) {
  if (!backupId) return json({ ok: false, error: "backup_id requerido" }, 400);

  const { data: meta, error: metaError } = await admin
    .from("backups_sigat")
    .select("id, archivo")
    .eq("id", backupId)
    .single();

  if (metaError) throw metaError;

  await admin.from("backups_sigat").update({ estado: "RESTAURANDO", ultimo_error: null }).eq("id", backupId);

  try {
    const { data: file, error: fileError } = await admin.storage
      .from("sigat-backups")
      .download(meta.archivo);
    if (fileError) throw fileError;

    const payload = JSON.parse(await file.text());
    if (payload?.app !== "SIGAT CMV" || payload?.format_version !== 1 || !payload?.tables) {
      throw new Error("El archivo no corresponde a una copia válida de SIGAT CMV");
    }

    // Limpiar solo datos funcionales. Auth, perfiles, backups y estructura permanecen.
    for (const table of DELETE_ORDER) {
      const { error } = await admin
        .from(table)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(`No se pudo limpiar ${table}: ${error.message}`);
    }

    for (const table of INSERT_ORDER) {
      const rows = payload.tables?.[table] || [];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await admin.from(table).insert(chunk);
        if (error) throw new Error(`No se pudo restaurar ${table}: ${error.message}`);
      }
    }

    // Restaurar configuración sin reemplazar su PK fija.
    const configRows = payload.tables?.configuracion_sigat || [];
    if (Array.isArray(configRows) && configRows[0]) {
      const config = { ...configRows[0], updated_by: userId, updated_at: new Date().toISOString() };
      const { error } = await admin.from("configuracion_sigat").upsert(config, { onConflict: "id" });
      if (error) throw error;
    }

    // La restauración de tickets dispara la cola. La limpiamos para no enviar correos históricos.
    await admin
      .from("notificaciones_ticket")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: seqError } = await admin.rpc("reajustar_secuencia_tickets_backup");
    if (seqError) throw seqError;

    await admin
      .from("backups_sigat")
      .update({
        estado: "RESTAURADO",
        restaurado_at: new Date().toISOString(),
        ultimo_error: null,
      })
      .eq("id", backupId);

    return json({ ok: true });
  } catch (error) {
    await admin
      .from("backups_sigat")
      .update({ estado: "ERROR", ultimo_error: error?.message || String(error) })
      .eq("id", backupId);
    throw error;
  }
}

async function fetchAll(admin: any, table: string) {
  const rows: unknown[] = [];
  const size = 1000;

  for (let from = 0; ; from += size) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .range(from, from + size - 1);

    if (error) throw new Error(`No se pudo respaldar ${table}: ${error.message}`);

    rows.push(...(data || []));
    if (!data || data.length < size) break;
  }

  return rows;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
