import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Play, Search, UserCheck, Wrench, XCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const ESTADOS = ["PENDIENTE", "ASIGNADA", "EN_PROCESO", "RESUELTA", "CERRADA", "CANCELADA"];
const estadoLabel = (v) => v.replaceAll("_", " ");
const nombrePersona = (p) => [p?.nombres, p?.apellidos].filter(Boolean).join(" ").trim();

export default function SolicitudesServicio() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const puedeGestionar = perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";
  const [solicitudes, setSolicitudes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ticketAsignar, setTicketAsignar] = useState(null);
  const [ticketDetalle, setTicketDetalle] = useState(null);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    const [sRes, pRes] = await Promise.all([
      supabase.from("solicitudes_servicio").select("*").order("fecha_solicitud", { ascending: false }),
      supabase.from("personas").select("id,nombres,apellidos,activo,dependencias(nombre)").eq("activo", true).order("nombres"),
    ]);
    if (sRes.error || pRes.error) setError(sRes.error?.message || pRes.error?.message);
    setSolicitudes(sRes.data || []);
    setTecnicos((pRes.data || []).filter((p) => p.dependencias?.nombre?.trim().toLowerCase() === "sistemas"));
    setCargando(false);
  }

  async function actualizarTicket(id, cambios) {
    const { error: e } = await supabase.from("solicitudes_servicio").update(cambios).eq("id", id);
    if (e) return setError(e.message);
    await cargar();
  }

  async function asignar(item, tecnicoId) {
    const tecnico = tecnicos.find((t) => t.id === tecnicoId);
    await actualizarTicket(item.id, {
      tecnico_asignado_id: tecnicoId || null,
      tecnico_asignado_nombre: tecnico ? nombrePersona(tecnico) : null,
      fecha_asignacion: tecnicoId ? new Date().toISOString() : null,
      estado: tecnicoId ? "ASIGNADA" : "PENDIENTE",
    });
  }

  function abrirAsignacion(item) {
    setTicketAsignar(item);
    setTecnicoSeleccionado(item.tecnico_asignado_id || "");
  }

  async function guardarAsignacion() {
    if (!ticketAsignar || !tecnicoSeleccionado) return;
    await asignar(ticketAsignar, tecnicoSeleccionado);
    setTicketAsignar(null);
    setTecnicoSeleccionado("");
  }

  async function iniciar(item) {
    if (!item.tecnico_asignado_id) return setError("Asigna primero un técnico.");
    await actualizarTicket(item.id, { estado: "EN_PROCESO", fecha_inicio: new Date().toISOString() });
  }

  async function cerrar(item) {
    const obs = window.prompt("Observación de cierre (opcional):") ?? "";
    await actualizarTicket(item.id, { estado: "CERRADA", fecha_cierre: new Date().toISOString(), observaciones_cierre: obs.trim() || null });
  }

  async function cancelar(item) {
    const motivo = window.prompt("Motivo de cancelación:");
    if (!motivo?.trim()) return;
    await actualizarTicket(item.id, { estado: "CANCELADA", fecha_cierre: new Date().toISOString(), observaciones_cierre: motivo.trim() });
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (estado && s.estado !== estado) return false;
      if (!q) return true;
      return [s.numero_ticket, s.solicitante_nombre, s.dependencia_nombre, s.placa_inventario, s.tipo, s.asunto, s.descripcion, s.tecnico_asignado_nombre]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [solicitudes, busqueda, estado]);

  const resumen = ESTADOS.slice(0, 5).map((e) => ({ estado: e, total: solicitudes.filter((s) => s.estado === e).length }));

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Mesa de servicio</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Solicitudes / Tickets</h1>
        <p className="mt-2 text-sm text-slate-500">Bandeja central de solicitudes de soporte y mantenimiento registradas por los funcionarios.</p>
      </section>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-sm text-red-700">{error}</div>}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {resumen.map((r) => (
          <button key={r.estado} onClick={() => setEstado(estado === r.estado ? "" : r.estado)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{estadoLabel(r.estado)}</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{r.total}</p>
          </button>
        ))}
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search size={17} className="absolute left-3 top-3 text-slate-400" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar ticket, funcionario, placa, asunto..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{estadoLabel(e)}</option>)}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 size={20} className="animate-spin" /> Cargando solicitudes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Acciones","Ticket","Fecha","Solicitante","Dependencia","Activo","Tipo / Asunto","Estado","Técnico"].map((h) =>
                    <th key={h} className="px-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="w-56 px-1.5 py-1.5">
                      {puedeGestionar && (
                        <div className="flex flex-wrap gap-1">
                          {item.estado === "PENDIENTE" && <button onClick={() => abrirAsignacion(item)} className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">Asignar</button>}
                          {item.estado === "ASIGNADA" && <button onClick={() => iniciar(item)} className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Iniciar</button>}
                          {["ASIGNADA","EN_PROCESO"].includes(item.estado) && item.tipo === "SOPORTE" && <button onClick={() => navigate(`/soportes-tecnicos?ticket=${item.id}`)} className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Soporte</button>}
                          {!["RESUELTA","CERRADA","CANCELADA"].includes(item.estado) && item.tipo === "MANTENIMIENTO" && <button onClick={() => navigate(`/mantenimientos?ticket=${item.id}`)} className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Mant.</button>}
                          {item.estado === "RESUELTA" && <button onClick={() => cerrar(item)} className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Cerrar</button>}
                          {!["CERRADA","CANCELADA"].includes(item.estado) && <button onClick={() => cancelar(item)} className="rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Cancelar</button>}
                        </div>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 text-xs font-bold text-blue-700">
                      <button onClick={() => setTicketDetalle(item)} className="underline hover:text-blue-900">
                        {item.numero_ticket}
                      </button>
                    </td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-600">{new Date(item.fecha_solicitud).toLocaleString("es-CO")}</td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-700"><strong>{item.solicitante_nombre}</strong><div className="truncate text-[11px] text-slate-500">{item.descripcion}</div></td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-600 truncate">{item.dependencia_nombre || "—"}</td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-600">{item.placa_inventario || "—"}</td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-600"><strong>{item.tipo}</strong><div className="truncate">{item.asunto}</div></td>
                    <td className="px-1.5 py-1.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{estadoLabel(item.estado)}</span></td>
                    <td className="px-1.5 py-1.5 text-xs text-slate-600">{item.tecnico_asignado_nombre || "—"}</td>
                  </tr>
                ))}
                {!filtradas.length && <tr><td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">No hay solicitudes para los filtros seleccionados.</td></tr>}
              </tbody>
            </table>          </div>
        )}
      </section>
      {ticketAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Asignar técnico</h2>
            <select value={tecnicoSeleccionado} onChange={(e)=>setTecnicoSeleccionado(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Seleccione técnico</option>
              {tecnicos.map((t)=><option key={t.id} value={t.id}>{nombrePersona(t)}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setTicketAsignar(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={guardarAsignacion} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Asignar</button>
            </div>
          </div>
        </div>
      )}

      {ticketDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Detalle ticket {ticketDetalle.numero_ticket}</h2>
              <button onClick={() => setTicketDetalle(null)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm">Cerrar</button>
            </div>
            <div className="grid gap-3 text-sm">
              <div><strong>Estado:</strong> {estadoLabel(ticketDetalle.estado)}</div>
              <div><strong>Fecha:</strong> {new Date(ticketDetalle.fecha_solicitud).toLocaleString("es-CO")}</div>
              <div><strong>Solicitante:</strong> {ticketDetalle.solicitante_nombre || "—"}</div>
              <div><strong>Dependencia:</strong> {ticketDetalle.dependencia_nombre || "—"}</div>
              <div><strong>Activo:</strong> {ticketDetalle.placa_inventario || "—"}</div>
              <div><strong>Tipo:</strong> {ticketDetalle.tipo || "—"}</div>
              <div><strong>Asunto:</strong> {ticketDetalle.asunto || "—"}</div>
              <div><strong>Descripción:</strong><p className="mt-1 rounded bg-slate-50 p-3">{ticketDetalle.descripcion || "—"}</p></div>
              <div><strong>Técnico asignado:</strong> {ticketDetalle.tecnico_asignado_nombre || "—"}</div>
              <div><strong>Observación cierre/cancelación:</strong><p className="mt-1 rounded bg-slate-50 p-3">{ticketDetalle.observaciones_cierre || "—"}</p></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
