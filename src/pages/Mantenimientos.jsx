import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const inicial = {
  solicitud_id: "",
  origen: "INTERNO",
  activo_id: "",
  tipo: "PREVENTIVO",
  fecha_mantenimiento: new Date().toISOString().slice(0, 10),
  tecnico_proveedor: "",
  diagnostico: "",
  trabajo_realizado: "",
  repuestos: "",
  proximo_mantenimiento: "",
  observaciones: "",
};

const BUCKET_PLANILLAS = "sigat-mantenimientos";

async function abrirPlanilla(path) {
  if (!path) return;
  const ventana = window.open("about:blank", "_blank");
  const { data, error } = await supabase.storage
    .from(BUCKET_PLANILLAS)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    ventana?.close();
    throw new Error(error?.message || "No se pudo abrir la planilla.");
  }
  if (ventana) ventana.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

function nombreArchivoSeguro(nombre) {
  return String(nombre || "planilla.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100) || "planilla.pdf";
}

function validarPDF(file) {
  if (!file) return "";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "El archivo debe estar en formato PDF.";
  }
  if (file.size > 20 * 1024 * 1024) return "El PDF no puede superar 20 MB.";
  return "";
}

export default function Mantenimientos() {
  const { perfil } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const puedeGestionar = perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";
  const ticketAutoAbiertoRef = useRef(false);

  const [activos, setActivos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [formulario, setFormulario] = useState(inicial);
  const [mostrar, setMostrar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [editandoDetalle, setEditandoDetalle] = useState(false);
  const [archivoPDF, setArchivoPDF] = useState(null);
  const [errorPlanilla, setErrorPlanilla] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [resActivos, resPersonas, resMant, resSolicitudes] = await Promise.all([
      supabase
        .from("activos")
        .select("id, codigo, serial, nombre_equipo, tipos_activo(nombre), marcas(nombre), modelo")
        .order("codigo", { ascending: true }),

      supabase
        .from("personas")
        .select(`
          id,
          nombres,
          apellidos,
          activo,
          dependencias(nombre)
        `)
        .eq("activo", true)
        .order("nombres", { ascending: true }),

      supabase
        .from("mantenimientos")
        .select(`
          id,
          solicitud_id,
          activo_id,
          tipo,
          fecha_mantenimiento,
          tecnico_proveedor,
          diagnostico,
          trabajo_realizado,
          repuestos,
          proximo_mantenimiento,
          observaciones,
          archivo_pdf,
          activos(codigo),
          solicitudes_servicio(numero_ticket)
        `)
        .order("fecha_mantenimiento", { ascending: false }),

      supabase
        .from("solicitudes_servicio")
        .select("id,numero_ticket,activo_id,tipo,asunto,descripcion,estado,tecnico_asignado_nombre")
        .eq("tipo", "MANTENIMIENTO")
        .in("estado", ["PENDIENTE", "ASIGNADA", "EN_PROCESO", "RESUELTA"])
        .order("fecha_solicitud", { ascending: false }),
    ]);

    if (resActivos.error) setError(resActivos.error.message);
    if (resPersonas.error) setError(resPersonas.error.message);
    if (resMant.error) setError(resMant.error.message);
    if (resSolicitudes.error) setError(resSolicitudes.error.message);

    setActivos(resActivos.data || []);

    const soloSistemas = (resPersonas.data || []).filter(
      (persona) =>
        persona.dependencias?.nombre
          ?.trim()
          .toLowerCase() === "sistemas",
    );

    setTecnicos(soloSistemas);
    setRegistros(resMant.data || []);
    setSolicitudes(resSolicitudes.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!ticketParam || ticketAutoAbiertoRef.current || !solicitudes.length) return;
    const ticket = solicitudes.find((item) => item.id === ticketParam);
    if (!ticket) return;
    ticketAutoAbiertoRef.current = true;
    setFormulario(aplicarSolicitud(ticket));
    setMostrar(true);
  }, [ticketParam, solicitudes]);

  function aplicarSolicitud(ticket) {
    if (!ticket) return { ...inicial, fecha_mantenimiento: new Date().toISOString().slice(0, 10) };
    return {
      ...inicial,
      solicitud_id: ticket.id,
      origen: "USUARIO",
      activo_id: ticket.activo_id || "",
      diagnostico: ticket.descripcion || "",
      observaciones: `Solicitud ${ticket.numero_ticket}: ${ticket.asunto || ""}`.trim(),
      fecha_mantenimiento: new Date().toISOString().slice(0, 10),
    };
  }

  function abrirNuevo() {
    const ticket = solicitudes.find((item) => item.id === ticketParam);

    if (ticket) {
      setFormulario(aplicarSolicitud(ticket));
    } else {
      setFormulario({
        ...inicial,
        origen: "INTERNO",
        fecha_mantenimiento: new Date().toISOString().slice(0, 10),
      });
    }

    setError("");
    setMensaje("");
    setArchivoPDF(null);
    setErrorPlanilla("");
    setMostrar(true);
  }

  function actualizar(key, value) {
    setFormulario((actual) => ({
      ...actual,
      [key]: value,
    }));
  }

  function abrirMantenimiento(item) {
    setDetalle(item);
    setEditandoDetalle(false);
    setArchivoPDF(null);
    setErrorPlanilla("");
    setError("");
    setFormulario({
      solicitud_id: item.solicitud_id || "",
      origen: "INTERNO",
      activo_id: item.activo_id,
      tipo: item.tipo || "PREVENTIVO",
      fecha_mantenimiento: item.fecha_mantenimiento || "",
      tecnico_proveedor: item.tecnico_proveedor || "",
      diagnostico: item.diagnostico || "",
      trabajo_realizado: item.trabajo_realizado || "",
      repuestos: item.repuestos || "",
      proximo_mantenimiento: item.proximo_mantenimiento || "",
      observaciones: item.observaciones || "",
    });
  }

  async function guardar(event) {
    event.preventDefault();

    if (!activos.some((activo) => activo.id === formulario.activo_id)) {
      setError("Busca y selecciona el activo que recibirá el mantenimiento.");
      return;
    }

    const errorArchivo = validarPDF(archivoPDF);
    if (errorArchivo) {
      setErrorPlanilla(errorArchivo);
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const tecnicoSeleccionado = tecnicos.find(
      (persona) =>
        [persona.nombres, persona.apellidos]
          .filter(Boolean)
          .join(" ") === formulario.tecnico_proveedor,
    );

    if (detalle && editandoDetalle) {
      let archivoPath = detalle.archivo_pdf || null;
      let nuevoArchivoPath = null;
      if (archivoPDF) {
        nuevoArchivoPath = `mantenimientos/${detalle.id}/${Date.now()}-${nombreArchivoSeguro(archivoPDF.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_PLANILLAS)
          .upload(nuevoArchivoPath, archivoPDF, { contentType: "application/pdf", upsert: false });
        if (uploadError) {
          setError(uploadError.message);
          setGuardando(false);
          return;
        }
        archivoPath = nuevoArchivoPath;
      }

      const { error: updateError } = await supabase
        .from("mantenimientos")
        .update({
          activo_id: formulario.activo_id,
          tipo: formulario.tipo,
          fecha_mantenimiento: formulario.fecha_mantenimiento,
          tecnico_proveedor: formulario.tecnico_proveedor.trim() || null,
          diagnostico: formulario.diagnostico.trim() || null,
          trabajo_realizado: formulario.trabajo_realizado.trim() || null,
          repuestos: formulario.repuestos.trim() || null,
          proximo_mantenimiento: formulario.proximo_mantenimiento || null,
          observaciones: formulario.observaciones.trim() || null,
          archivo_pdf: archivoPath,
        })
        .eq("id", detalle.id);

      if (updateError) {
        if (nuevoArchivoPath) await supabase.storage.from(BUCKET_PLANILLAS).remove([nuevoArchivoPath]);
        setError(updateError.message);
        setGuardando(false);
        return;
      }
      if (nuevoArchivoPath && detalle.archivo_pdf) {
        await supabase.storage.from(BUCKET_PLANILLAS).remove([detalle.archivo_pdf]);
      }
      setMensaje("Mantenimiento actualizado correctamente.");
      setDetalle(null);
      setEditandoDetalle(false);
      setArchivoPDF(null);
      setGuardando(false);
      await cargar();
      return;
    }

    let solicitudId = formulario.solicitud_id;
    let numeroTicket = "";

    // ========================================================
    // MANTENIMIENTO PROGRAMADO DIRECTAMENTE POR GESTIÓN TIC
    // No exige ticket previo: SIGAT lo crea automáticamente.
    // ========================================================
    if (!solicitudId) {
      const activoSeleccionado = activos.find(
        (activo) => activo.id === formulario.activo_id,
      );

      const tipoLegible =
        formulario.tipo === "PREVENTIVO"
          ? "preventivo"
          : "correctivo";

      const asuntoInterno =
        `Mantenimiento ${tipoLegible} programado por Gestión TIC`;

      const descripcionInterna =
        formulario.diagnostico.trim() ||
        formulario.observaciones.trim() ||
        `Mantenimiento ${tipoLegible} programado internamente para el activo ${activoSeleccionado?.codigo || ""}.`;

      const { data: ticketCreado, error: ticketError } = await supabase
        .rpc("crear_ticket_mantenimiento_interno", {
          p_activo_id: formulario.activo_id,
          p_asunto: asuntoInterno,
          p_descripcion: descripcionInterna,
          p_tecnico_id: tecnicoSeleccionado?.id || null,
          p_tecnico_nombre: formulario.tecnico_proveedor || null,
        });

      if (ticketError) {
        setError(ticketError.message);
        setGuardando(false);
        return;
      }

      const ticket =
        Array.isArray(ticketCreado)
          ? ticketCreado[0]
          : ticketCreado;

      solicitudId = ticket?.id || "";
      numeroTicket = ticket?.numero_ticket || "";

      if (!solicitudId) {
        setError("SIGAT no pudo generar el ticket interno del mantenimiento.");
        setGuardando(false);
        return;
      }
    }

    const payload = {
      solicitud_id: solicitudId,
      activo_id: formulario.activo_id,
      tipo: formulario.tipo,
      fecha_mantenimiento: formulario.fecha_mantenimiento,
      tecnico_proveedor:
        formulario.tecnico_proveedor.trim() || null,
      diagnostico: formulario.diagnostico.trim() || null,
      trabajo_realizado:
        formulario.trabajo_realizado.trim() || null,
      repuestos: formulario.repuestos.trim() || null,
      costo: null,
      proximo_mantenimiento:
        formulario.proximo_mantenimiento || null,
      observaciones:
        formulario.observaciones.trim() || null,
      registrado_por: perfil?.id || null,
    };

    const nuevoId = crypto.randomUUID();
    let nuevoArchivoPath = null;
    if (archivoPDF) {
      nuevoArchivoPath = `mantenimientos/${nuevoId}/${Date.now()}-${nombreArchivoSeguro(archivoPDF.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_PLANILLAS)
        .upload(nuevoArchivoPath, archivoPDF, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setError(uploadError.message);
        setGuardando(false);
        return;
      }
    }

    const { error: insertError } = await supabase
      .from("mantenimientos")
      .insert({ ...payload, id: nuevoId, archivo_pdf: nuevoArchivoPath });

    if (insertError) {
      if (nuevoArchivoPath) await supabase.storage.from(BUCKET_PLANILLAS).remove([nuevoArchivoPath]);
      setError(insertError.message);
      setGuardando(false);
      return;
    }

    await supabase
      .from("solicitudes_servicio")
      .update({
        estado: "RESUELTA",
        fecha_resolucion: new Date().toISOString(),
        tecnico_asignado_id: tecnicoSeleccionado?.id || null,
        tecnico_asignado_nombre:
          formulario.tecnico_proveedor || null,
      })
      .eq("id", solicitudId);

    setMensaje(
      numeroTicket
        ? `Mantenimiento registrado correctamente. SIGAT generó automáticamente el ticket ${numeroTicket}.`
        : "Mantenimiento registrado correctamente y ticket marcado como RESUELTO.",
    );

    setFormulario({
      ...inicial,
      origen: "INTERNO",
      fecha_mantenimiento:
        new Date().toISOString().slice(0, 10),
    });

    setMostrar(false);
    setArchivoPDF(null);
    setGuardando(false);

    await cargar();
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return registros;

    return registros.filter((item) =>
      [
        item.activos?.codigo,
        item.solicitudes_servicio?.numero_ticket,
        item.tipo,
        item.tecnico_proveedor,
        item.diagnostico,
        item.trabajo_realizado,
        item.observaciones,
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [registros, busqueda]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Soporte técnico
        </p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Mantenimientos
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Registra mantenimientos preventivos y correctivos realizados a los activos.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Historial de mantenimientos
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {registros.length} registro(s).
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Nuevo mantenimiento
            </button>
          )}
        </div>

        <div className="mt-6 flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search size={17} className="text-slate-400" />

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar placa, técnico, diagnóstico..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {detalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Detalle del mantenimiento</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">Placa {detalle.activos?.codigo || "—"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{detalle.fecha_mantenimiento} · {detalle.tipo === "PREVENTIVO" ? "Preventivo" : "Correctivo"}</p>
                </div>
                <button type="button" onClick={() => { setDetalle(null); setEditandoDetalle(false); setArchivoPDF(null); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar detalle"><X size={20} /></button>
              </div>

              {editandoDetalle ? (
                <form onSubmit={guardar} className="space-y-4 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo label="Fecha *" type="date" value={formulario.fecha_mantenimiento} onChange={(v) => actualizar("fecha_mantenimiento", v)} required />
                    <SelectorActivo activos={activos} value={formulario.activo_id} onChange={(value) => actualizar("activo_id", value)} />
                    <label className="text-sm font-medium text-slate-700">Tipo *
                      <select value={formulario.tipo} onChange={(e) => actualizar("tipo", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="PREVENTIVO">Preventivo</option><option value="CORRECTIVO">Correctivo</option></select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">Técnico *
                      <select required value={formulario.tecnico_proveedor} onChange={(e) => actualizar("tecnico_proveedor", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="">Seleccionar técnico</option>
                        {tecnicos.map((persona) => {
                          const nombre = [persona.nombres, persona.apellidos].filter(Boolean).join(" ");
                          return <option key={persona.id} value={nombre}>{nombre}</option>;
                        })}
                      </select>
                    </label>
                    <Campo label="Próximo mantenimiento" type="date" value={formulario.proximo_mantenimiento} onChange={(v) => actualizar("proximo_mantenimiento", v)} />
                  </div>
                  <Area label="Diagnóstico" value={formulario.diagnostico} onChange={(v) => actualizar("diagnostico", v)} />
                  <Area label="Trabajo realizado" value={formulario.trabajo_realizado} onChange={(v) => actualizar("trabajo_realizado", v)} />
                  <Area label="Repuestos" value={formulario.repuestos} onChange={(v) => actualizar("repuestos", v)} />
                  <Area label="Observaciones" value={formulario.observaciones} onChange={(v) => actualizar("observaciones", v)} />
                  <ArchivoPlanilla archivo={archivoPDF} setArchivo={setArchivoPDF} error={errorPlanilla} setError={setErrorPlanilla} existente={detalle.archivo_pdf} onAbrir={abrirPlanilla} />
                  {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setEditandoDetalle(false); setArchivoPDF(null); setError(""); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
                    <button type="submit" disabled={guardando} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{guardando ? "Guardando..." : "Guardar cambios"}</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5 p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Dato label="Ticket" valor={detalle.solicitudes_servicio?.numero_ticket || "—"} />
                    <Dato label="Tipo" valor={detalle.tipo === "PREVENTIVO" ? "Preventivo" : "Correctivo"} />
                    <Dato label="Técnico / proveedor" valor={detalle.tecnico_proveedor || "—"} />
                    <Dato label="Próximo mantenimiento" valor={detalle.proximo_mantenimiento || "—"} />
                    <Dato label="Diagnóstico" valor={detalle.diagnostico || "—"} />
                    <Dato label="Trabajo realizado" valor={detalle.trabajo_realizado || "—"} />
                    <Dato label="Repuestos" valor={detalle.repuestos || "—"} />
                    <Dato label="Observaciones" valor={detalle.observaciones || "—"} />
                  </div>
                  {detalle.archivo_pdf ? (
                    <button type="button" onClick={() => abrirPlanilla(detalle.archivo_pdf).catch((e) => setError(e.message))} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">Abrir planilla escaneada (PDF)</button>
                  ) : <p className="text-sm text-slate-500">Este mantenimiento aún no tiene una planilla escaneada adjunta.</p>}
                  {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                  <div className="flex justify-end">
                    {puedeGestionar && <button type="button" onClick={() => { setEditandoDetalle(true); setError(""); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Editar mantenimiento</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {mensaje && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={17} />
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mostrar && (
          <form
            onSubmit={guardar}
            className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">
                Nuevo mantenimiento
              </h4>

              <button
                type="button"
                onClick={() => setMostrar(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {formulario.solicitud_id ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Mantenimiento originado por solicitud de usuario
                  </p>

                  <p className="mt-1 text-sm font-semibold text-emerald-900">
                    {solicitudes.find(
                      (item) => item.id === formulario.solicitud_id,
                    )?.numero_ticket || "Ticket vinculado"}
                    {" — "}
                    {solicitudes.find(
                      (item) => item.id === formulario.solicitud_id,
                    )?.asunto || ""}
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Este mantenimiento quedará vinculado al ticket existente.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Mantenimiento programado por Gestión TIC
                  </p>

                  <p className="mt-1 text-sm text-blue-900">
                    No necesitas seleccionar una solicitud. Al guardar,
                    SIGAT generará automáticamente un ticket interno y lo
                    vinculará a este mantenimiento.
                  </p>
                </div>
              )}

              <SelectorActivo activos={activos} value={formulario.activo_id} onChange={(value) => actualizar("activo_id", value)} />

              <label className="text-sm font-medium text-slate-700">
                Tipo *
                <select
                  value={formulario.tipo}
                  onChange={(e) =>
                    actualizar("tipo", e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="PREVENTIVO">
                    Preventivo
                  </option>
                  <option value="CORRECTIVO">
                    Correctivo
                  </option>
                </select>
              </label>

              <Campo
                label="Fecha *"
                type="date"
                value={formulario.fecha_mantenimiento}
                onChange={(v) =>
                  actualizar("fecha_mantenimiento", v)
                }
                required
              />

              <label className="text-sm font-medium text-slate-700">
                Técnico *
                <select
                  required
                  value={formulario.tecnico_proveedor}
                  onChange={(e) =>
                    actualizar(
                      "tecnico_proveedor",
                      e.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Seleccionar técnico
                  </option>

                  {tecnicos.map((persona) => {
                    const nombreCompleto = [
                      persona.nombres,
                      persona.apellidos,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <option
                        key={persona.id}
                        value={nombreCompleto}
                      >
                        {nombreCompleto}
                      </option>
                    );
                  })}
                </select>

                {tecnicos.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No hay personas activas registradas en la dependencia Sistemas.
                  </p>
                )}
              </label>

              <Campo
                label="Próximo mantenimiento"
                type="date"
                value={formulario.proximo_mantenimiento}
                onChange={(v) =>
                  actualizar("proximo_mantenimiento", v)
                }
              />
            </div>

            <Area
              label="Diagnóstico"
              value={formulario.diagnostico}
              onChange={(v) =>
                actualizar("diagnostico", v)
              }
            />

            <Area
              label="Trabajo realizado"
              value={formulario.trabajo_realizado}
              onChange={(v) =>
                actualizar("trabajo_realizado", v)
              }
            />

            <Area
              label="Repuestos"
              value={formulario.repuestos}
              onChange={(v) =>
                actualizar("repuestos", v)
              }
            />

            <Area
              label="Observaciones"
              value={formulario.observaciones}
              onChange={(v) =>
                actualizar("observaciones", v)
              }
            />

            <ArchivoPlanilla archivo={archivoPDF} setArchivo={setArchivoPDF} error={errorPlanilla} setError={setErrorPlanilla} onAbrir={abrirPlanilla} />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrar(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Fecha",
                  "Ticket",
                  "Placa",
                  "Tipo",
                  "Técnico",
                  "Diagnóstico",
                  "Trabajo realizado",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {cargando ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No hay mantenimientos.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.fecha_mantenimiento}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                      {item.solicitudes_servicio?.numero_ticket || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold">
                      <button type="button" onClick={() => abrirMantenimiento(item)} className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900" title="Ver detalle del mantenimiento">
                        {item.activos?.codigo || "—"}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.tipo === "PREVENTIVO"
                        ? "Preventivo"
                        : "Correctivo"}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.tecnico_proveedor || "—"}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                      {item.diagnostico || "—"}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                      {item.trabajo_realizado || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  step,
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}

      <input
        type={type}
        required={required}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Area({ label, value, onChange }) {
  return (
    <label className="mt-4 block text-sm font-medium text-slate-700">
      {label}

      <textarea
        rows="3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function ArchivoPlanilla({ archivo, setArchivo, error, setError, existente, onAbrir }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-medium text-slate-700">
        Planilla escaneada (PDF)
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            const validation = validarPDF(file);
            setError(validation);
            setArchivo(validation ? null : file);
          }}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
        />
      </label>
      <p className="mt-2 text-xs text-slate-500">Adjunta el PDF escaneado de la planilla firmada. Tamaño máximo: 20 MB.</p>
      {archivo && <p className="mt-2 text-sm text-emerald-700">Archivo seleccionado: {archivo.name}</p>}
      {!archivo && existente && (
        <button type="button" onClick={() => onAbrir(existente).catch(() => {})} className="mt-2 text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">Ver planilla PDF actual</button>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{valor}</p>
    </div>
  );
}

function normalizarBusquedaActivo(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function SelectorActivo({ activos, value, onChange }) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const seleccionado = activos.find((activo) => activo.id === value);
  const etiquetaSeleccionada = seleccionado
    ? [seleccionado.codigo, seleccionado.tipos_activo?.nombre, seleccionado.marcas?.nombre, seleccionado.modelo]
        .filter(Boolean)
        .join(" — ")
    : "";
  const filtro = normalizarBusquedaActivo(busqueda.trim());
  const resultados = activos
    .filter((activo) => {
      if (!filtro) return true;
      const datos = [activo.codigo, activo.serial, activo.nombre_equipo, activo.tipos_activo?.nombre, activo.marcas?.nombre, activo.modelo]
        .map(normalizarBusquedaActivo)
        .join(" ");
      return datos.includes(filtro);
    })
    .slice(0, 12);

  return (
    <label className="relative block text-sm font-medium text-slate-700">
      Activo *
      <div className="relative mt-2">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          required={!value}
          autoComplete="off"
          value={abierto ? busqueda : etiquetaSeleccionada}
          onFocus={() => { setBusqueda(""); setAbierto(true); }}
          onBlur={() => setAbierto(false)}
          onChange={(event) => {
            setBusqueda(event.target.value);
            setAbierto(true);
            onChange("");
          }}
          placeholder="Escribe placa, serial, tipo o modelo..."
          aria-label="Buscar activo para mantenimiento"
          aria-expanded={abierto}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {abierto && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {resultados.length ? resultados.map((activo) => (
            <button
              key={activo.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(activo.id);
                setBusqueda("");
                setAbierto(false);
              }}
              className="w-full px-3 py-2.5 text-left hover:bg-blue-50"
            >
              <span className="block font-semibold text-slate-800">{activo.codigo}</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {[activo.tipos_activo?.nombre, activo.marcas?.nombre, activo.modelo, activo.serial ? `Serial ${activo.serial}` : ""]
                  .filter(Boolean)
                  .join(" · ") || activo.nombre_equipo || "Activo tecnológico"}
              </span>
            </button>
          )) : (
            <p className="px-3 py-3 text-sm font-normal text-slate-500">No hay activos que coincidan con la búsqueda.</p>
          )}
        </div>
      )}
      {seleccionado && !abierto && (
        <span className="mt-2 block rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-normal text-emerald-800">
          <span className="block font-semibold">Activo seleccionado: {seleccionado.codigo}</span>
          <span className="mt-0.5 block">
            {[seleccionado.tipos_activo?.nombre, seleccionado.marcas?.nombre, seleccionado.modelo, seleccionado.serial ? `Serial ${seleccionado.serial}` : ""]
              .filter(Boolean)
              .join(" · ") || seleccionado.nombre_equipo || "Sin datos adicionales"}
          </span>
        </span>
      )}
    </label>
  );
}
