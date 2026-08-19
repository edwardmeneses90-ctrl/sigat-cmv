import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import SoporteTecnicoImprimible from "../components/soportes/SoporteTecnicoImprimible";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function nombrePersona(persona) {
  if (!persona) return "";

  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

const FORM_INICIAL = {
  solicitud_id: "",
  fecha: hoy(),
  tipo_soporte: "",
  actividad_realizada: "",
  dependencia_id: "",
  tecnico_id: "",
  solicitante_id: "",
  activo_id: "",
  observaciones: "",
};

export default function SoportesTecnicos() {
  const { perfil } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");

  const puedeGestionar =
    perfil?.rol === "ADMIN" ||
    perfil?.rol === "TECNICO";

  const printRef = useRef(null);
  const ticketAutoAbiertoRef = useRef(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [soportes, setSoportes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [activos, setActivos] = useState([]);

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroDependencia, setFiltroDependencia] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (!ticketParam || ticketAutoAbiertoRef.current || !solicitudes.length) return;
    const ticket = solicitudes.find((item) => item.id === ticketParam);
    if (!ticket) return;
    ticketAutoAbiertoRef.current = true;
    setEditando(null);
    setForm(aplicarSolicitud(ticket));
    setModal(true);
  }, [ticketParam, solicitudes]);

  async function cargarTodo() {
    setCargando(true);
    setError("");

    const [
      soportesRes,
      personasRes,
      dependenciasRes,
      activosRes,
      solicitudesRes,
    ] = await Promise.all([
      supabase
        .from("soportes_tecnicos")
        .select("*")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("personas")
        .select(`
          id,
          identificacion,
          nombres,
          apellidos,
          cargo,
          activo,
          dependencia_id,
          dependencias(id,nombre)
        `)
        .eq("activo", true)
        .order("nombres"),

      supabase
        .from("dependencias")
        .select("id,nombre,activo")
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("activos")
        .select("id,codigo,nombre_equipo,serial,estado")
        .order("codigo"),

      supabase
        .from("solicitudes_servicio")
        .select("id,numero_ticket,solicitante_id,dependencia_id,activo_id,tipo,asunto,descripcion,estado,tecnico_asignado_id")
        .eq("tipo", "SOPORTE")
        .in("estado", ["PENDIENTE", "ASIGNADA", "EN_PROCESO", "RESUELTA"])
        .order("fecha_solicitud", { ascending: false }),
    ]);

    const firstError = [
      soportesRes.error,
      personasRes.error,
      dependenciasRes.error,
      activosRes.error,
      solicitudesRes.error,
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setCargando(false);
      return;
    }

    setSoportes(soportesRes.data || []);
    setPersonas(personasRes.data || []);
    setDependencias(dependenciasRes.data || []);
    setActivos(activosRes.data || []);
    setSolicitudes(solicitudesRes.data || []);
    setCargando(false);
  }

  const tecnicos = useMemo(() => {
    return personas.filter(
      (persona) =>
        persona.dependencias?.nombre
          ?.trim()
          .toLowerCase() === "sistemas",
    );
  }, [personas]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return soportes.filter((item) => {
      if (desde && item.fecha < desde) return false;
      if (hasta && item.fecha > hasta) return false;

      if (
        filtroDependencia &&
        item.dependencia_id !== filtroDependencia
      ) {
        return false;
      }

      if (
        filtroTecnico &&
        item.tecnico_id !== filtroTecnico
      ) {
        return false;
      }

      if (!q) return true;

      return [
        item.tipo_soporte,
        item.actividad_realizada,
        item.dependencia_nombre,
        item.tecnico_nombre,
        item.solicitante_nombre,
        item.observaciones,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [
    soportes,
    busqueda,
    desde,
    hasta,
    filtroDependencia,
    filtroTecnico,
  ]);

  function aplicarSolicitud(ticket) {
    if (!ticket) return FORM_INICIAL;
    return {
      ...FORM_INICIAL,
      solicitud_id: ticket.id,
      solicitante_id: ticket.solicitante_id || "",
      dependencia_id: ticket.dependencia_id || "",
      activo_id: ticket.activo_id || "",
      tipo_soporte: ticket.asunto || "Soporte técnico",
      observaciones: `Solicitud ${ticket.numero_ticket}: ${ticket.descripcion || ""}`.trim(),
    };
  }

  function abrirNuevo() {
    setEditando(null);
    const ticket = solicitudes.find((item) => item.id === ticketParam);
    setForm(aplicarSolicitud(ticket));
    setError("");
    setMensaje("");
    setModal(true);
  }

  function abrirEditar(item) {
    setEditando(item);

    setForm({
      solicitud_id: item.solicitud_id || "",
      fecha: item.fecha || hoy(),
      tipo_soporte: item.tipo_soporte || "",
      actividad_realizada: item.actividad_realizada || "",
      dependencia_id: item.dependencia_id || "",
      tecnico_id: item.tecnico_id || "",
      solicitante_id: item.solicitante_id || "",
      activo_id: item.activo_id || "",
      observaciones: item.observaciones || "",
    });

    setError("");
    setMensaje("");
    setModal(true);
  }

  function cambiarSolicitante(id) {
    const persona = personas.find((item) => item.id === id);

    setForm((prev) => ({
      ...prev,
      solicitante_id: id,
      dependencia_id:
        persona?.dependencia_id ||
        prev.dependencia_id,
    }));
  }

  async function guardar(e) {
    e.preventDefault();

    if (!form.solicitud_id) {
      setError("Debes seleccionar el ticket que originó el soporte.");
      return;
    }

    if (!form.tipo_soporte.trim()) {
      setError("Debes indicar el tipo de soporte.");
      return;
    }

    if (!form.actividad_realizada.trim()) {
      setError("Debes indicar la actividad realizada.");
      return;
    }

    if (!form.dependencia_id) {
      setError("Debes seleccionar la dependencia.");
      return;
    }

    if (!form.tecnico_id) {
      setError("Debes seleccionar quién realizó el soporte.");
      return;
    }

    if (!form.solicitante_id) {
      setError("Debes seleccionar el usuario solicitante.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const dependencia = dependencias.find(
      (item) => item.id === form.dependencia_id,
    );

    const tecnico = personas.find(
      (item) => item.id === form.tecnico_id,
    );

    const solicitante = personas.find(
      (item) => item.id === form.solicitante_id,
    );

    const payload = {
      solicitud_id: form.solicitud_id,
      fecha: form.fecha,
      tipo_soporte: form.tipo_soporte.trim(),
      actividad_realizada: form.actividad_realizada.trim(),

      dependencia_id: form.dependencia_id,
      dependencia_nombre: dependencia?.nombre || null,

      tecnico_id: form.tecnico_id,
      tecnico_nombre: nombrePersona(tecnico),

      solicitante_id: form.solicitante_id,
      solicitante_nombre: nombrePersona(solicitante),

      activo_id: form.activo_id || null,
      observaciones: form.observaciones.trim() || null,
    };

    let respuesta;

    if (editando) {
      respuesta = await supabase
        .from("soportes_tecnicos")
        .update(payload)
        .eq("id", editando.id);
    } else {
      respuesta = await supabase
        .from("soportes_tecnicos")
        .insert(payload);
    }

    if (respuesta.error) {
      setError(respuesta.error.message);
      setGuardando(false);
      return;
    }

    if (!editando) {
      await supabase
        .from("solicitudes_servicio")
        .update({
          estado: "RESUELTA",
          fecha_resolucion: new Date().toISOString(),
          tecnico_asignado_id: form.tecnico_id,
          tecnico_asignado_nombre: nombrePersona(tecnico),
        })
        .eq("id", form.solicitud_id);
    }

    setGuardando(false);
    setModal(false);
    setMensaje(
      editando
        ? "Soporte actualizado correctamente."
        : "Soporte registrado correctamente.",
    );

    await cargarTodo();
  }

  async function anular(item) {
    if (!puedeGestionar || item.anulado) return;

    const motivo = window.prompt(
      "Indica el motivo de anulación del registro:",
    );

    if (!motivo?.trim()) return;

    const { error: updateError } = await supabase
      .from("soportes_tecnicos")
      .update({
        anulado: true,
        motivo_anulacion: motivo.trim(),
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje("Registro anulado. El histórico se conserva.");
    await cargarTodo();
  }

  function imprimir() {
    window.print();
  }

  const elaboradoPor =
    filtrados.length === 1
      ? filtrados[0].tecnico_nombre
      : filtroTecnico
        ? nombrePersona(
            personas.find(
              (item) => item.id === filtroTecnico,
            ),
          )
        : "";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="no-print">
        <section className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Gestión TIC
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Soportes técnicos diarios
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Registro digital del formato FOR-GESTIC-10. Conserva el histórico,
              permite consultar los soportes y genera el formato institucional
              para impresión.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={18} />
              Imprimir formato
            </button>

            {puedeGestionar && (
              <button
                type="button"
                onClick={abrirNuevo}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={18} />
                Registrar soporte
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative">
              <Search
                size={17}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar soporte..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Desde
              </span>

              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Hasta
              </span>

              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Dependencia
              </span>

              <select
                value={filtroDependencia}
                onChange={(e) => setFiltroDependencia(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>

                {dependencias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Técnico
              </span>

              <select
                value={filtroTecnico}
                onChange={(e) => setFiltroTecnico(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>

                {tecnicos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {nombrePersona(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Registro de soportes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filtrados.length} registro(s)
              </p>
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="animate-spin" size={20} />
              Cargando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Fecha",
                      "Tipo de soporte",
                      "Actividad realizada",
                      "Dependencia",
                      "Realiza soporte",
                      "Usuario solicitante",
                      "Activo",
                      "Estado",
                      "",
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtrados.map((item) => {
                    const activo = activos.find(
                      (a) => a.id === item.activo_id,
                    );

                    return (
                      <tr
                        key={item.id}
                        className={item.anulado ? "bg-slate-50 opacity-60" : ""}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {item.fecha}
                        </td>

                        <td className="min-w-52 px-4 py-3 text-sm font-medium text-slate-800">
                          {item.tipo_soporte}
                        </td>

                        <td className="min-w-72 px-4 py-3 text-sm text-slate-600">
                          {item.actividad_realizada}
                        </td>

                        <td className="min-w-44 px-4 py-3 text-sm text-slate-600">
                          {item.dependencia_nombre || "—"}
                        </td>

                        <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                          {item.tecnico_nombre}
                        </td>

                        <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                          {item.solicitante_nombre}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-blue-700">
                          {activo?.codigo || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {item.anulado ? (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Anulado
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Registrado
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {puedeGestionar && !item.anulado && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => abrirEditar(item)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                title="Anular"
                                onClick={() => anular(item)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              >
                                <Ban size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!filtrados.length && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-14 text-center text-sm text-slate-500"
                      >
                        No hay soportes para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editando ? "Editar soporte" : "Registrar soporte técnico"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Campos del formato institucional FOR-GESTIC-10.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardar} className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Campo label="Ticket de solicitud *">
                      <select
                        value={form.solicitud_id}
                        onChange={(e) => {
                          const ticket = solicitudes.find((item) => item.id === e.target.value);
                          setForm(aplicarSolicitud(ticket));
                        }}
                        className="campo"
                        required
                        disabled={Boolean(editando)}
                      >
                        <option value="">Seleccionar solicitud...</option>
                        {solicitudes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.numero_ticket} — {item.asunto}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  </div>

                  <Campo label="Fecha">
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) =>
                        setForm({ ...form, fecha: e.target.value })
                      }
                      className="campo"
                      required
                    />
                  </Campo>

                  <Campo label="Tipo de soporte">
                    <input
                      value={form.tipo_soporte}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tipo_soporte: e.target.value,
                        })
                      }
                      placeholder="Ej. Solicitud mantenimiento preventivo"
                      className="campo"
                      required
                    />
                  </Campo>

                  <div className="md:col-span-2">
                    <Campo label="Actividad realizada">
                      <textarea
                        rows={3}
                        value={form.actividad_realizada}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            actividad_realizada: e.target.value,
                          })
                        }
                        placeholder="Describe concretamente qué actividad se realizó."
                        className="campo resize-none"
                        required
                      />
                    </Campo>
                  </div>

                  <Campo label="Usuario solicitante">
                    <select
                      value={form.solicitante_id}
                      onChange={(e) => cambiarSolicitante(e.target.value)}
                      className="campo"
                      required
                    >
                      <option value="">Seleccionar...</option>

                      {personas.map((item) => (
                        <option key={item.id} value={item.id}>
                          {nombrePersona(item)}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Dependencia">
                    <select
                      value={form.dependencia_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dependencia_id: e.target.value,
                        })
                      }
                      className="campo"
                      required
                    >
                      <option value="">Seleccionar...</option>

                      {dependencias.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Nombre quien realiza el soporte">
                    <select
                      value={form.tecnico_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tecnico_id: e.target.value,
                        })
                      }
                      className="campo"
                      required
                    >
                      <option value="">Seleccionar técnico...</option>

                      {tecnicos.map((item) => (
                        <option key={item.id} value={item.id}>
                          {nombrePersona(item)}
                        </option>
                      ))}
                    </select>

                    {!tecnicos.length && (
                      <p className="mt-1 text-xs text-amber-700">
                        No hay personas activas asociadas a la dependencia Sistemas.
                      </p>
                    )}
                  </Campo>

                  <Campo label="Activo relacionado (opcional)">
                    <select
                      value={form.activo_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activo_id: e.target.value,
                        })
                      }
                      className="campo"
                    >
                      <option value="">No aplica / soporte general</option>

                      {activos.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigo}
                          {item.nombre_equipo ? ` — ${item.nombre_equipo}` : ""}
                          {item.serial ? ` — ${item.serial}` : ""}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <div className="md:col-span-2">
                    <Campo label="Observaciones internas (opcional)">
                      <textarea
                        rows={2}
                        value={form.observaciones}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            observaciones: e.target.value,
                          })
                        }
                        className="campo resize-none"
                        placeholder="No se imprime en el formato oficial."
                      />
                    </Campo>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {guardando ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}

                    {guardando ? "Guardando..." : "Guardar soporte"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style>{`
          .campo {
            width: 100%;
            border: 1px solid rgb(203 213 225);
            border-radius: 0.75rem;
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
            background: white;
          }

          .campo:focus {
            border-color: rgb(59 130 246);
          }

          @media print {
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>

      <div className="hidden print:block">
        <SoporteTecnicoImprimible
          ref={printRef}
          soportes={filtrados}
          elaboradoPor={elaboradoPor}
        />
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}
