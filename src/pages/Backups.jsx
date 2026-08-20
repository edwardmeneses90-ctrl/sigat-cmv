import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  HardDriveDownload,
  Loader2,
  Mail,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function formatoBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatoFecha(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Backups() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "ADMIN";

  const [correo, setCorreo] = useState("");
  const [backups, setBackups] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin]);

  async function cargar() {
    setCargando(true);
    setError("");

    const [configRes, backupsRes] = await Promise.all([
      supabase
        .from("configuracion_sigat")
        .select("correo_notificaciones")
        .eq("id", 1)
        .single(),
      supabase
        .from("backups_sigat")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (configRes.error) setError(configRes.error.message);
    else setCorreo(configRes.data?.correo_notificaciones || "");

    if (backupsRes.error) setError(backupsRes.error.message);
    else setBackups(backupsRes.data || []);

    setCargando(false);
  }

  async function guardarCorreo() {
    setProcesando("correo");
    setError("");
    setMensaje("");

    const valor = correo.trim().toLowerCase();
    if (valor && !/^\S+@\S+\.\S+$/.test(valor)) {
      setError("Escribe un correo electrónico válido.");
      setProcesando("");
      return;
    }

    const { error: updateError } = await supabase
      .from("configuracion_sigat")
      .update({
        correo_notificaciones: valor || null,
        updated_at: new Date().toISOString(),
        updated_by: perfil?.id || null,
      })
      .eq("id", 1);

    if (updateError) setError(updateError.message);
    else setMensaje("Correo de notificaciones actualizado.");

    setProcesando("");
  }

  async function crearBackup() {
    setProcesando("crear");
    setError("");
    setMensaje("");

    const { data, error: fnError } = await supabase.functions.invoke("backups-sigat", {
      body: { action: "create" },
    });

    if (fnError || !data?.ok) {
      setError(data?.error || fnError?.message || "No se pudo crear la copia.");
    } else {
      setMensaje("Copia de seguridad creada correctamente.");
      await cargar();
    }

    setProcesando("");
  }

  async function descargar(item) {
    setProcesando(`download-${item.id}`);
    setError("");

    const { data, error: fnError } = await supabase.functions.invoke("backups-sigat", {
      body: { action: "download", backup_id: item.id },
    });

    if (fnError || !data?.ok || !data?.url) {
      setError(data?.error || fnError?.message || "No se pudo descargar la copia.");
    } else {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }

    setProcesando("");
  }

  async function restaurar(item) {
    const confirmacion = window.prompt(
      `Vas a reemplazar los datos actuales de SIGAT por la copia del ${formatoFecha(item.created_at)}.\n\nEscribe RESTAURAR para continuar.`,
    );

    if (confirmacion !== "RESTAURAR") return;

    setProcesando(`restore-${item.id}`);
    setError("");
    setMensaje("");

    const { data, error: fnError } = await supabase.functions.invoke("backups-sigat", {
      body: { action: "restore", backup_id: item.id },
    });

    if (fnError || !data?.ok) {
      setError(data?.error || fnError?.message || "No se pudo restaurar la copia.");
    } else {
      setMensaje("Copia restaurada correctamente. Recarga SIGAT antes de continuar trabajando.");
      await cargar();
    }

    setProcesando("");
  }

  if (!esAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Solo el rol ADMIN puede administrar copias de seguridad.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Administración</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Notificaciones y copias de seguridad</h1>
        <p className="mt-2 text-sm text-slate-500">
          Configura el aviso de nuevos tickets y conserva puntos de recuperación de los datos de SIGAT.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{mensaje}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Mail size={22} /></div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Correo para nuevos tickets</h2>
            <p className="mt-1 text-sm text-slate-500">Cada solicitud creada por un funcionario puede generar un aviso inmediato a este correo.</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="sistemas@concejodevillavicencio.gov.co"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={guardarCorreo}
                disabled={procesando === "correo"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {procesando === "correo" ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar correo
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><HardDriveDownload size={22} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Copias de seguridad</h2>
              <p className="mt-1 text-sm text-slate-500">La copia incluye datos funcionales de SIGAT. No modifica ni respalda contraseñas de Supabase Auth.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={cargar} className="rounded-xl border border-slate-300 p-3 text-slate-600 hover:bg-slate-50" title="Actualizar">
              <RefreshCcw size={18} />
            </button>
            <button
              type="button"
              onClick={crearBackup}
              disabled={procesando === "crear"}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {procesando === "crear" ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Crear copia ahora
            </button>
          </div>
        </div>

        <div className="border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          <div className="flex gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p><strong>Restaurar reemplaza los datos actuales</strong> de inventario, personas, tickets, mantenimientos, soportes y conceptos por los contenidos en esa copia. El usuario ADMIN y la estructura del sistema se conservan.</p></div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 size={20} className="animate-spin" />Cargando copias...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Fecha", "Archivo", "Tamaño", "Registros", "Creada por", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatoFecha(item.created_at)}</td>
                    <td className="min-w-64 px-4 py-3 text-sm font-medium text-slate-800">{item.archivo?.split("/").pop()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatoBytes(item.tamano_bytes)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.total_registros ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.creado_por_usuario || "—"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.estado}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => descargar(item)}
                          disabled={procesando === `download-${item.id}` || !["CREADO", "RESTAURADO"].includes(item.estado)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                          title="Descargar copia"
                        >
                          {procesando === `download-${item.id}` ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => restaurar(item)}
                          disabled={procesando === `restore-${item.id}` || !["CREADO", "RESTAURADO"].includes(item.estado)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                          title="Restaurar esta copia"
                        >
                          {procesando === `restore-${item.id}` ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!backups.length && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500">Todavía no hay copias de seguridad.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
