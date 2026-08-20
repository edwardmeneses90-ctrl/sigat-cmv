import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const ticketId = body?.ticket_id;

    if (!ticketId) {
      return json(
        {
          ok: false,
          error: "ticket_id requerido",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword =
      Deno.env.get("GMAIL_APP_PASSWORD");

    if (!supabaseUrl || !serviceRole) {
      return json(
        {
          ok: false,
          error:
            "Faltan variables internas de Supabase.",
        },
        500,
      );
    }

    if (!gmailUser || !gmailAppPassword) {
      return json(
        {
          ok: false,
          error:
            "Faltan GMAIL_USER o GMAIL_APP_PASSWORD.",
        },
        500,
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // ========================================================
    // 1. Buscar la notificación asociada al ticket
    // ========================================================

    const { data: cola, error: colaError } =
      await admin
        .from("notificaciones_ticket")
        .select(
          "id, estado, intentos, solicitud_id",
        )
        .eq("solicitud_id", ticketId)
        .eq("tipo", "CREACION")
        .maybeSingle();

    if (colaError) {
      throw colaError;
    }

    // Ticket interno o ticket que no requiere notificación.
    if (!cola) {
      return json({
        ok: true,
        skipped: true,
        reason: "sin_notificacion_pendiente",
      });
    }

    // Evitar correos duplicados.
    if (cola.estado === "ENVIADA") {
      return json({
        ok: true,
        skipped: true,
        reason: "ya_enviada",
      });
    }

    // ========================================================
    // 2. Obtener información completa del ticket
    // ========================================================

    const [
      { data: ticket, error: ticketError },
      { data: config, error: configError },
    ] = await Promise.all([
      admin
        .from("solicitudes_servicio")
        .select(`
          id,
          numero_ticket,
          fecha_solicitud,
          solicitante_nombre,
          dependencia_nombre,
          placa_inventario,
          tipo,
          asunto,
          descripcion,
          prioridad,
          estado
        `)
        .eq("id", ticketId)
        .single(),

      admin
        .from("configuracion_sigat")
        .select("correo_notificaciones")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (ticketError) {
      throw ticketError;
    }

    if (configError) {
      console.warn(
        "No se pudo consultar configuracion_sigat:",
        configError.message,
      );
    }

    const toEmail =
      Deno.env.get(
        "TICKET_NOTIFICATION_EMAIL",
      ) ||
      config?.correo_notificaciones;

    if (!toEmail) {
      await marcarError(
        admin,
        cola,
        "No hay correo de notificaciones configurado.",
      );

      return json(
        {
          ok: false,
          error:
            "No hay correo de notificaciones configurado.",
        },
        400,
      );
    }

    // ========================================================
    // 3. Preparar Gmail SMTP
    // ========================================================

    const transporter =
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,

        auth: {
          user: gmailUser,
          pass: gmailAppPassword.replaceAll(
            " ",
            "",
          ),
        },
      });

    await transporter.verify();

    // ========================================================
    // 4. Construir correo
    // ========================================================

    const subject =
      `SIGAT CMV | Nuevo ticket ${ticket.numero_ticket} | ${ticket.tipo}`;

    const html = `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:680px;
        margin:auto;
        color:#0f172a
      ">
        <div style="
          background:#2563eb;
          color:white;
          padding:22px;
          border-radius:14px 14px 0 0
        ">
          <div style="
            font-size:13px;
            opacity:.85
          ">
            SIGAT CMV · Mesa de Servicio
          </div>

          <h2 style="margin:7px 0 0">
            Nuevo ticket
            ${escapeHtml(ticket.numero_ticket)}
          </h2>
        </div>

        <div style="
          border:1px solid #dbeafe;
          border-top:0;
          padding:24px;
          border-radius:0 0 14px 14px
        ">
          <p>
            Se registró una nueva solicitud
            de servicio TIC.
          </p>

          <table style="
            width:100%;
            border-collapse:collapse;
            font-size:14px
          ">
            ${row(
              "Tipo",
              ticket.tipo,
            )}

            ${row(
              "Solicitante",
              ticket.solicitante_nombre,
            )}

            ${row(
              "Dependencia",
              ticket.dependencia_nombre ||
                "—",
            )}

            ${row(
              "Placa",
              ticket.placa_inventario ||
                "No aplica",
            )}

            ${row(
              "Asunto",
              ticket.asunto,
            )}

            ${row(
              "Prioridad",
              ticket.prioridad,
            )}

            ${row(
              "Estado",
              ticket.estado,
            )}
          </table>

          <div style="
            margin-top:18px;
            background:#f8fafc;
            border-radius:10px;
            padding:14px
          ">
            <strong>Descripción</strong>

            <p style="
              white-space:pre-wrap;
              margin:8px 0 0
            ">
              ${escapeHtml(
                ticket.descripcion,
              )}
            </p>
          </div>

          <p style="
            margin-top:20px;
            font-size:12px;
            color:#64748b
          ">
            Mensaje automático generado
            por SIGAT CMV.
          </p>
        </div>
      </div>
    `;

    const texto = [
      "SIGAT CMV - Mesa de Servicio",
      "",
      `Nuevo ticket: ${ticket.numero_ticket}`,
      `Tipo: ${ticket.tipo}`,
      `Solicitante: ${ticket.solicitante_nombre || "—"}`,
      `Dependencia: ${ticket.dependencia_nombre || "—"}`,
      `Placa: ${ticket.placa_inventario || "No aplica"}`,
      `Asunto: ${ticket.asunto || "—"}`,
      `Prioridad: ${ticket.prioridad || "—"}`,
      `Estado: ${ticket.estado || "—"}`,
      "",
      "Descripción:",
      ticket.descripcion || "—",
    ].join("\n");

    // ========================================================
    // 5. Enviar correo
    // ========================================================

    const info =
      await transporter.sendMail({
        from:
          `"SIGAT CMV" <${gmailUser}>`,
        to: toEmail,
        replyTo: gmailUser,
        subject,
        text: texto,
        html,
      });

    // ========================================================
    // 6. Marcar notificación como enviada
    // ========================================================

    const { error: updateError } =
      await admin
        .from("notificaciones_ticket")
        .update({
          estado: "ENVIADA",
          intentos:
            (cola.intentos || 0) + 1,
          ultimo_error: null,
          provider_id:
            info.messageId || null,
          enviado_at:
            new Date().toISOString(),
        })
        .eq("id", cola.id);

    if (updateError) {
      console.error(
        "Correo enviado, pero no se pudo actualizar la cola:",
        updateError,
      );
    }

    return json({
      ok: true,
      numero_ticket:
        ticket.numero_ticket,
      message_id:
        info.messageId || null,
    });
  } catch (error) {
    console.error(
      "Error enviando notificación de ticket:",
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado",
      },
      500,
    );
  }
});

async function marcarError(
  admin: any,
  cola: any,
  mensaje: string,
) {
  try {
    await admin
      .from("notificaciones_ticket")
      .update({
        estado: "ERROR",
        intentos:
          (cola?.intentos || 0) + 1,
        ultimo_error:
          mensaje.slice(0, 1500),
      })
      .eq("id", cola.id);
  } catch (error) {
    console.error(
      "No se pudo registrar el error de notificación:",
      error,
    );
  }
}

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}

function escapeHtml(
  value: unknown,
) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function row(
  label: string,
  value: unknown,
) {
  return `
    <tr>
      <td style="
        padding:8px 8px 8px 0;
        color:#64748b;
        width:140px;
        border-bottom:1px solid #e2e8f0
      ">
        ${escapeHtml(label)}
      </td>

      <td style="
        padding:8px 0;
        font-weight:600;
        border-bottom:1px solid #e2e8f0
      ">
        ${escapeHtml(value || "—")}
      </td>
    </tr>
  `;
}
