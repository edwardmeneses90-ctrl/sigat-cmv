import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Faltan variables de entorno de Supabase.",
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return respuesta(
        { error: "Sesión requerida." },
        401,
      );
    }

    const token = authorization.replace(
      /^Bearer\s+/i,
      "",
    );

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return respuesta(
        { error: "Sesión inválida." },
        401,
      );
    }

    const { data: perfilAdmin, error: perfilError } =
      await admin
        .from("perfiles")
        .select("id, rol, activo")
        .eq("id", user.id)
        .single();

    if (
      perfilError ||
      !perfilAdmin ||
      !perfilAdmin.activo ||
      perfilAdmin.rol !== "ADMIN"
    ) {
      return respuesta(
        { error: "Solo un ADMIN puede crear usuarios." },
        403,
      );
    }

    const body = await req.json();

    const usuario = String(
      body.usuario ?? "",
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password ?? "",
    );

    const nombres = String(
      body.nombres ?? "",
    ).trim();

    const apellidos = String(
      body.apellidos ?? "",
    ).trim();

    const rol = String(
      body.rol ?? "CONSULTA",
    ).toUpperCase();

    if (
      !/^[a-z0-9._-]{3,40}$/.test(usuario)
    ) {
      return respuesta(
        {
          error:
            "Usuario inválido. Usa 3 a 40 caracteres: letras minúsculas, números, punto, guion o guion bajo.",
        },
        400,
      );
    }

    if (password.length < 8) {
      return respuesta(
        {
          error:
            "La contraseña debe tener mínimo 8 caracteres.",
        },
        400,
      );
    }

    if (!nombres) {
      return respuesta(
        { error: "Los nombres son obligatorios." },
        400,
      );
    }

    if (
      ![
        "ADMIN",
        "TECNICO",
        "CONSULTA",
      ].includes(rol)
    ) {
      return respuesta(
        { error: "Rol inválido." },
        400,
      );
    }

    const { data: existente } = await admin
      .from("perfiles")
      .select("id")
      .eq("usuario", usuario)
      .maybeSingle();

    if (existente) {
      return respuesta(
        { error: "Ese usuario ya existe." },
        409,
      );
    }

    const emailTecnico =
      `${usuario}@sigat.local`;

    const {
      data: nuevoAuth,
      error: createError,
    } = await admin.auth.admin.createUser({
      email: emailTecnico,
      password,
      email_confirm: true,
      user_metadata: {
        usuario,
        nombres,
        apellidos,
      },
    });

    if (createError || !nuevoAuth.user) {
      return respuesta(
        {
          error:
            createError?.message ||
            "No se pudo crear el usuario.",
        },
        400,
      );
    }

    const { error: updateProfileError } =
      await admin
        .from("perfiles")
        .update({
          usuario,
          nombres,
          apellidos: apellidos || null,
          rol,
          activo: true,
        })
        .eq("id", nuevoAuth.user.id);

    if (updateProfileError) {
      await admin.auth.admin.deleteUser(
        nuevoAuth.user.id,
      );

      return respuesta(
        {
          error:
            "Se creó Auth pero falló el perfil. La operación fue revertida.",
        },
        500,
      );
    }

    return respuesta(
      {
        ok: true,
        usuario,
        rol,
      },
      201,
    );
  } catch (error) {
    return respuesta(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado.",
      },
      500,
    );
  }
});

function respuesta(
  body: Record<string, unknown>,
  status: number,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}
