import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ ok: false, error: "Método no permitido." }, 405);
  }

  let createdAuthId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Faltan variables internas de Supabase.");
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return response(
        {
          ok: false,
          error: "Sesión no válida. Cierra sesión e ingresa nuevamente.",
        },
        401,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const jwt = authorization.replace(/^Bearer\s+/i, "");

    const { data: callerData, error: callerError } =
      await admin.auth.getUser(jwt);

    if (callerError || !callerData?.user) {
      console.error("Error validando sesión:", callerError);

      return response(
        {
          ok: false,
          error: "No fue posible validar la sesión.",
          detalle: callerError?.message || null,
        },
        401,
      );
    }

    const { data: callerProfile, error: profileCheckError } =
      await admin
        .from("perfiles")
        .select("id, usuario, rol, activo")
        .eq("id", callerData.user.id)
        .single();

    if (profileCheckError) {
      console.error("Error consultando perfil ADMIN:", profileCheckError);

      return response(
        {
          ok: false,
          error: "No fue posible verificar permisos.",
          detalle: profileCheckError.message,
        },
        500,
      );
    }

    if (
      callerProfile?.rol !== "ADMIN" ||
      callerProfile?.activo !== true
    ) {
      return response(
        {
          ok: false,
          error: "Solo un ADMIN puede crear usuarios.",
        },
        403,
      );
    }

    const body = await req.json();

    const usuario = clean(body?.usuario).toLowerCase();
    const nombres = clean(body?.nombres);
    const apellidos = clean(body?.apellidos);
    const rol = clean(body?.rol).toUpperCase();
    const password = clean(
      body?.password ??
      body?.contrasena ??
      body?.contraseña
    );

    if (!/^[a-z0-9._-]{3,50}$/.test(usuario)) {
      return response(
        {
          ok: false,
          error:
            "Usuario inválido. Usa minúsculas, números, punto, guion o guion bajo.",
        },
        400,
      );
    }

    if (!["ADMIN", "TECNICO", "CONSULTA"].includes(rol)) {
      return response(
        {
          ok: false,
          error: "Rol no válido.",
        },
        400,
      );
    }

    if (password.length < 6) {
      return response(
        {
          ok: false,
          error: "La contraseña debe tener mínimo 6 caracteres.",
        },
        400,
      );
    }

    const email = `${usuario}@sigat.local`;

    // Evitar duplicado en public.perfiles
    const { data: existingProfile, error: existingProfileError } =
      await admin
        .from("perfiles")
        .select("id, usuario")
        .eq("usuario", usuario)
        .maybeSingle();

    if (existingProfileError) {
      console.error("Error verificando perfil existente:", existingProfileError);
      return response(
        {
          ok: false,
          error: "No fue posible validar si el usuario ya existe.",
          detalle: existingProfileError.message,
        },
        500,
      );
    }

    if (existingProfile) {
      return response(
        {
          ok: false,
          error: `El usuario "${usuario}" ya existe.`,
        },
        409,
      );
    }

    // Crear usuario Auth con metadata útil para trazabilidad.
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          usuario,
          nombres,
          apellidos,
          rol,
        },
      });

    if (authError || !authData?.user) {
      console.error("Error creando Authentication:", authError);

      return response(
        {
          ok: false,
          error:
            authError?.message ||
            "No fue posible crear el usuario en Authentication.",
        },
        400,
      );
    }

    createdAuthId = authData.user.id;

    // UPSERT asegura que el perfil exista aunque haya un trigger o proceso previo.
    const { data: savedProfile, error: saveProfileError } =
      await admin
        .from("perfiles")
        .upsert(
          {
            id: createdAuthId,
            usuario,
            nombres,
            apellidos,
            rol,
            activo: true,
          },
          {
            onConflict: "id",
          },
        )
        .select("id, usuario, nombres, apellidos, rol, activo")
        .single();

    if (saveProfileError || !savedProfile) {
      console.error(
        "ERROR CREANDO public.perfiles:",
        JSON.stringify(saveProfileError),
      );

      // No dejar cuentas huérfanas en Auth.
      const { error: rollbackError } =
        await admin.auth.admin.deleteUser(createdAuthId);

      if (rollbackError) {
        console.error(
          "ERROR ELIMINANDO AUTH DURANTE ROLLBACK:",
          rollbackError,
        );
      }

      createdAuthId = null;

      return response(
        {
          ok: false,
          error: "Authentication se creó, pero el perfil no pudo guardarse.",
          detalle: saveProfileError?.message || "Error desconocido en perfiles.",
          codigo: saveProfileError?.code || null,
        },
        400,
      );
    }

    // Verificación final obligatoria antes de responder éxito.
    const { data: verifyProfile, error: verifyError } =
      await admin
        .from("perfiles")
        .select("id, usuario, nombres, apellidos, rol, activo")
        .eq("id", createdAuthId)
        .single();

    if (verifyError || !verifyProfile) {
      console.error("Perfil no encontrado después del UPSERT:", verifyError);

      await admin.auth.admin.deleteUser(createdAuthId);
      createdAuthId = null;

      return response(
        {
          ok: false,
          error:
            "El usuario no quedó registrado correctamente. La operación fue revertida.",
          detalle: verifyError?.message || null,
        },
        500,
      );
    }

    console.log(
      "Usuario creado correctamente en Auth y perfiles:",
      verifyProfile.usuario,
      verifyProfile.rol,
    );

    return response({
      ok: true,
      message: "Usuario creado correctamente.",
      usuario: verifyProfile,
    });
  } catch (error) {
    console.error("Error no controlado en crear-usuario:", error);

    return response(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al crear usuario.",
      },
      500,
    );
  }
});
