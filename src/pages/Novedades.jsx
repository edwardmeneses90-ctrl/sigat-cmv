import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const TIPOS = [
  ["FALLA", "Falla"],
  ["DANO", "Daño"],
  ["GARANTIA", "Garantía"],
  ["PERDIDA", "Pérdida"],
  ["HURTO", "Hurto"],
  ["PRESTAMO", "Préstamo"],
  ["DEVOLUCION", "Devolución"],
  ["CAMBIO_COMPONENTE", "Cambio de componente"],
  ["OTRO", "Otro"],
];

const inicial = {
  activo_id: "",
  tipo: "FALLA",
  tecnico: "",
  descripcion: "",
  observaciones: "",
};

function etiquetaTipo(value) {
  return TIPOS.find(([key]) => key === value)?.[1] || value;
}

export default function Novedades() {
  const { perfil } = useAuth();
  const puedeGestionar =
    perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";

  const [activos, setActivos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [formulario, setFormulario] = useState(inicial);
  const [mostrar, setMostrar] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError("");

    const [resActivos, resPersonas, resNovedades] =
      await Promise.all([
        supabase
          .from("activos")
          .select("id, codigo, tipos_activo(nombre)")
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
          .from("novedades")
          .select(`
            id,
            activo_id,
            tipo,
            fecha_novedad,
            descripcion,
            observaciones,
            activos(codigo)
          `)
          .order("fecha_novedad", { ascending: false }),
      ]);

    if (resActivos.error) {
      setError(resActivos.error.message);
    }

    if (resPersonas.error) {
      setError(resPersonas.error.message);
    }

    if (resNovedades.error) {
      setError(resNovedades.error.message);
    }

    setActivos(resActivos.data || []);

    const soloSistemas = (resPersonas.data || []).filter(
      (persona) =>
        persona.dependencias?.nombre
          ?.trim()
          .toLowerCase() === "sistemas",
    );

    setTecnicos(soloSistemas);
    setRegistros(resNovedades.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizar(key, value) {
    setFormulario((actual) => ({
      ...actual,
      [key]: value,
    }));
  }

  async function guardar(event) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    const tecnicoSeleccionado =
      formulario.tecnico.trim();

    const descripcionFinal = [
      tecnicoSeleccionado
        ? `Técnico: ${tecnicoSeleccionado}`
        : "",
      formulario.descripcion.trim(),
    ]
      .filter(Boolean)
      .join(" | ");

    const payload = {
      activo_id: formulario.activo_id,
      tipo: formulario.tipo,
      descripcion: descripcionFinal,
      observaciones:
        formulario.observaciones.trim() || null,
      registrado_por: perfil?.id || null,
    };

    const { error: insertError } = await supabase
      .from("novedades")
      .insert(payload);

    if (insertError) {
      setError(insertError.message);
      setGuardando(false);
      return;
    }

    setMensaje("Novedad registrada correctamente.");
    setFormulario(inicial);
    setMostrar(false);
    setGuardando(false);

    await cargar();
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return registros;

    return registros.filter((item) =>
      [
        item.activos?.codigo,
        item.tipo,
        item.descripcion,
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
          Seguimiento
        </p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Novedades
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Registra fallas, daños, garantías y otros eventos relevantes.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Historial de novedades
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {registros.length} registro(s).
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={() => setMostrar(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Nueva novedad
            </button>
          )}
        </div>

        <div className="mt-6 flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search
            size={17}
            className="text-slate-400"
          />

          <input
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Buscar placa, técnico, tipo, descripción..."
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

        {mostrar && (
          <form
            onSubmit={guardar}
            className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">
                Nueva novedad
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
              <label className="text-sm font-medium text-slate-700">
                Activo *
                <select
                  required
                  value={formulario.activo_id}
                  onChange={(e) =>
                    actualizar(
                      "activo_id",
                      e.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Seleccionar activo
                  </option>

                  {activos.map((activo) => (
                    <option
                      key={activo.id}
                      value={activo.id}
                    >
                      {activo.codigo} —{" "}
                      {activo.tipos_activo?.nombre || ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Tipo *
                <select
                  value={formulario.tipo}
                  onChange={(e) =>
                    actualizar("tipo", e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  {TIPOS.map(([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Técnico / quien realiza la novedad *
                <select
                  required
                  value={formulario.tecnico}
                  onChange={(e) =>
                    actualizar(
                      "tecnico",
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
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Descripción *
              <textarea
                required
                rows="3"
                value={formulario.descripcion}
                onChange={(e) =>
                  actualizar(
                    "descripcion",
                    e.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Observaciones
              <textarea
                rows="3"
                value={formulario.observaciones}
                onChange={(e) =>
                  actualizar(
                    "observaciones",
                    e.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

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
                {guardando
                  ? "Guardando..."
                  : "Guardar"}
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
                  "Placa",
                  "Tipo",
                  "Descripción",
                  "Observaciones",
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
                    colSpan="5"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No hay novedades.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(
                        item.fecha_novedad,
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                      {item.activos?.codigo || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {etiquetaTipo(item.tipo)}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                      {item.descripcion}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                      {item.observaciones || "—"}
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
