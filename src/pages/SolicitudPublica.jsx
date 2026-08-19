import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Search, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

const INICIAL = {
  solicitante_id: "",
  ultimos4: "",
  activo_id: "",
  tipo: "SOPORTE",
  asunto: "",
  descripcion: "",
};

export default function SolicitudPublica() {
  const [personas, setPersonas] = useState([]);
  const [activos, setActivos] = useState([]);
  const [form, setForm] = useState(INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoActivos, setCargandoActivos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    cargarPersonas();
  }, []);

  async function cargarPersonas() {
    setCargando(true);
    const { data, error: rpcError } = await supabase.rpc("listar_solicitantes_publicos");
    if (rpcError) setError(rpcError.message);
    setPersonas(data || []);
    setCargando(false);
  }

  async function cambiarSolicitante(id) {
    setForm((prev) => ({ ...prev, solicitante_id: id, activo_id: "" }));
    setActivos([]);
    setError("");
    if (!id) return;

    setCargandoActivos(true);
    const { data, error: rpcError } = await supabase.rpc(
      "listar_activos_solicitante_publico",
      { p_persona_id: id },
    );
    if (rpcError) setError(rpcError.message);
    setActivos(data || []);
    setCargandoActivos(false);
  }

  const personaSeleccionada = personas.find((p) => p.id === form.solicitante_id);

  const personasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((p) =>
      [p.nombre, p.dependencia].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [personas, busqueda]);

  async function enviar(e) {
    e.preventDefault();
    setError("");

    if (!form.solicitante_id) return setError("Selecciona el funcionario solicitante.");
    if (!/^\d{4}$/.test(form.ultimos4)) return setError("Ingresa exactamente los últimos 4 dígitos de la identificación.");
    if (!form.asunto.trim()) return setError("Escribe el asunto de la solicitud.");
    if (!form.descripcion.trim()) return setError("Describe la solicitud.");

    setEnviando(true);
    const { data, error: rpcError } = await supabase.rpc("crear_solicitud_publica", {
      p_solicitante_id: form.solicitante_id,
      p_ultimos4: form.ultimos4,
      p_activo_id: form.activo_id || null,
      p_tipo: form.tipo,
      p_asunto: form.asunto.trim(),
      p_descripcion: form.descripcion.trim(),
    });
    setEnviando(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setTicket(data?.[0] || null);
  }

  function nuevaSolicitud() {
    setForm(INICIAL);
    setActivos([]);
    setTicket(null);
    setError("");
    setBusqueda("");
  }

  if (ticket) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <CheckCircle2 className="mx-auto text-emerald-600" size={54} />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Solicitud registrada</h1>
          <p className="mt-2 text-sm text-slate-500">Guarda este número para identificar tu solicitud.</p>
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Número de ticket</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-blue-900">{ticket.numero_ticket}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Estado: PENDIENTE</p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={nuevaSolicitud}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Registrar otra solicitud
            </button>

            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl bg-blue-600 px-6 py-6 text-white shadow-lg sm:px-8">
          <img src="/logo-concejo-villavicencio-blanco.png" alt="Concejo Municipal de Villavicencio" className="mx-auto h-auto w-full max-w-xs object-contain" />
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-bold">Solicitud de servicio TIC</h1>
            <p className="mt-2 text-sm text-blue-100">Registra aquí una solicitud de soporte o mantenimiento. No necesitas usuario ni contraseña.</p>
          </div>
        </div>

        <form onSubmit={enviar} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <div className="space-y-6">
            <section>
              <label className="mb-2 block text-sm font-bold text-slate-800">1. Funcionario solicitante *</label>
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-300 px-3">
                <Search size={17} className="text-slate-400" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe tu nombre para buscar..." className="w-full py-2.5 text-sm outline-none" />
              </div>
              <select value={form.solicitante_id} onChange={(e) => cambiarSolicitante(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500" required>
                <option value="">Selecciona tu nombre...</option>
                {personasFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.dependencia ? ` — ${p.dependencia}` : ""}</option>)}
              </select>
              {cargando && <p className="mt-2 text-xs text-slate-400">Cargando funcionarios...</p>}
            </section>

            {personaSeleccionada && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                <p><strong>Funcionario:</strong> {personaSeleccionada.nombre}</p>
                <p className="mt-1"><strong>Dependencia:</strong> {personaSeleccionada.dependencia || "Sin dependencia"}</p>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">2. Últimos 4 dígitos de tu identificación *</span>
              <input inputMode="numeric" maxLength={4} value={form.ultimos4} onChange={(e) => setForm({ ...form, ultimos4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="Ej. 4587" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500" required />
              <p className="mt-1 text-xs text-slate-400">Se usa únicamente para validar que seleccionaste tu propio nombre.</p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">3. Equipo relacionado</span>
              <select disabled={!form.solicitante_id || cargandoActivos} value={form.activo_id} onChange={(e) => setForm({ ...form, activo_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none disabled:bg-slate-100">
                <option value="">No aplica / solicitud sin equipo específico</option>
                {activos.map((a) => <option key={a.id} value={a.id}>{a.placa} — {[a.nombre_equipo, a.marca, a.modelo].filter(Boolean).join(" ")}</option>)}
              </select>
              {cargandoActivos && <p className="mt-2 text-xs text-slate-400">Buscando equipos asignados...</p>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">4. Tipo de solicitud *</span>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500">
                  <option value="SOPORTE">Soporte técnico</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">5. Asunto *</span>
                <input value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} placeholder="Ej. El equipo no enciende" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500" required />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">6. Describe el problema o necesidad *</span>
              <textarea rows={5} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe de forma sencilla qué sucede o qué necesitas..." className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500" required />
            </label>
          </div>

          <button type="submit" disabled={enviando || cargando} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {enviando ? "Registrando solicitud..." : "Enviar solicitud"}
          </button>

          <a
            href="/login"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Volver al inicio de sesión
          </a>
        </form>
      </div>
    </main>
  );
}