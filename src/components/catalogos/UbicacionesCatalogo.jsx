import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const inicial = {
  sede_id: "",
  nombre: "",
  edificio: "",
  piso: "",
  oficina: "",
  descripcion: "",
};

export default function UbicacionesCatalogo() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "ADMIN";

  const [ubicaciones, setUbicaciones] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [resUbicaciones, resSedes] = await Promise.all([
      supabase
        .from("ubicaciones")
        .select(
          "id, sede_id, nombre, edificio, piso, oficina, descripcion, activo, sedes(nombre)",
        )
        .order("nombre", { ascending: true }),

      supabase
        .from("sedes")
        .select("id, nombre, activo")
        .order("nombre", { ascending: true }),
    ]);

    if (resUbicaciones.error) {
      setError(resUbicaciones.error.message);
    } else {
      setUbicaciones(resUbicaciones.data || []);
    }

    if (resSedes.error) {
      setError(resSedes.error.message);
    } else {
      setSedes(resSedes.data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setFormulario(inicial);
    setEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function abrirEditar(item) {
    setFormulario({
      sede_id: item.sede_id || "",
      nombre: item.nombre || "",
      edificio: item.edificio || "",
      piso: item.piso || "",
      oficina: item.oficina || "",
      descripcion: item.descripcion || "",
    });
    setEditando(item);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setFormulario(inicial);
    setEditando(null);
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      sede_id: formulario.sede_id,
      nombre: formulario.nombre.trim(),
      edificio: formulario.edificio.trim() || null,
      piso: formulario.piso.trim() || null,
      oficina: formulario.oficina.trim() || null,
      descripcion: formulario.descripcion.trim() || null,
    };

    let resultado;

    if (editando) {
      resultado = await supabase
        .from("ubicaciones")
        .update(payload)
        .eq("id", editando.id);
    } else {
      resultado = await supabase
        .from("ubicaciones")
        .insert(payload);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editando
        ? "Ubicación actualizada correctamente."
        : "Ubicación creada correctamente.",
    );

    setGuardando(false);
    cerrarFormulario();
    await cargar();
  }

  async function cambiarEstado(item) {
    setError("");
    setMensaje("");

    const { error: updateError } = await supabase
      .from("ubicaciones")
      .update({ activo: !item.activo })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje(
      item.activo
        ? "Ubicación desactivada."
        : "Ubicación activada.",
    );

    await cargar();
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return ubicaciones;

    return ubicaciones.filter((item) =>
      [
        item.nombre,
        item.edificio,
        item.piso,
        item.oficina,
        item.sedes?.nombre,
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [ubicaciones, busqueda]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Ubicaciones
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Lugares específicos dentro de cada sede.
          </p>
        </div>

        {esAdmin && (
          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Nueva
          </button>
        )}
      </div>

      <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Search size={17} className="text-slate-400" />
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar ubicación..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

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

      {mostrarFormulario && (
        <form
          onSubmit={guardar}
          className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">
              {editando
                ? "Editar ubicación"
                : "Nueva ubicación"}
            </h4>

            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Sede *
              <select
                required
                value={formulario.sede_id}
                onChange={(event) =>
                  setFormulario((actual) => ({
                    ...actual,
                    sede_id: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">
                  Seleccionar sede
                </option>

                {sedes
                  .filter(
                    (sede) =>
                      sede.activo ||
                      sede.id === formulario.sede_id,
                  )
                  .map((sede) => (
                    <option
                      key={sede.id}
                      value={sede.id}
                    >
                      {sede.nombre}
                    </option>
                  ))}
              </select>
            </label>

            {[
              ["nombre", "Nombre *", true],
              ["edificio", "Edificio", false],
              ["piso", "Piso", false],
              ["oficina", "Oficina", false],
              ["descripcion", "Descripción", false],
            ].map(([key, label, required]) => (
              <label
                key={key}
                className="text-sm font-medium text-slate-700"
              >
                {label}
                <input
                  required={required}
                  value={formulario[key]}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      [key]: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={cerrarFormulario}
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
                "Sede",
                "Nombre",
                "Edificio",
                "Piso",
                "Oficina",
                "Estado",
              ].map((titulo) => (
                <th
                  key={titulo}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {titulo}
                </th>
              ))}

              {esAdmin && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              )}
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
            ) : filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No hay ubicaciones.
                </td>
              </tr>
            ) : (
              filtradas.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.sedes?.nombre || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {item.nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.edificio || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.piso || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.oficina || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        item.activo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  {esAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(item)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(item)}
                          className={[
                            "rounded-lg border p-2",
                            item.activo
                              ? "border-red-200 text-red-600"
                              : "border-emerald-200 text-emerald-600",
                          ].join(" ")}
                          title={
                            item.activo
                              ? "Desactivar"
                              : "Activar"
                          }
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
