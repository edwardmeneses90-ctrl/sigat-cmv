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

function crearFormulario(campos) {
  return campos.reduce((acc, campo) => {
    acc[campo.key] = "";
    return acc;
  }, {});
}

export default function CatalogoSimple({
  tabla,
  titulo,
  descripcion,
  campos,
  columnas,
}) {
  const { perfil } = useAuth();
  const puedeGestionar =
    perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";

  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(
    crearFormulario(campos),
  );

  async function cargar() {
    setCargando(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from(tabla)
      .select("*")
      .order("nombre", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setRegistros([]);
    } else {
      setRegistros(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [tabla]);

  function abrirNuevo() {
    setEditando(null);
    setFormulario(crearFormulario(campos));
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function abrirEditar(registro) {
    const valores = crearFormulario(campos);

    campos.forEach((campo) => {
      valores[campo.key] = registro[campo.key] ?? "";
    });

    setEditando(registro);
    setFormulario(valores);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setEditando(null);
    setFormulario(crearFormulario(campos));
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {};

    campos.forEach((campo) => {
      const valor =
        typeof formulario[campo.key] === "string"
          ? formulario[campo.key].trim()
          : formulario[campo.key];

      payload[campo.key] = valor === "" ? null : valor;
    });

    let resultado;

    if (editando) {
      resultado = await supabase
        .from(tabla)
        .update(payload)
        .eq("id", editando.id);
    } else {
      resultado = await supabase
        .from(tabla)
        .insert(payload);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editando
        ? "Registro actualizado correctamente."
        : "Registro creado correctamente.",
    );

    setGuardando(false);
    cerrarFormulario();
    await cargar();
  }

  async function cambiarEstado(registro) {
    setError("");
    setMensaje("");

    const { error: updateError } = await supabase
      .from(tabla)
      .update({ activo: !registro.activo })
      .eq("id", registro.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje(
      registro.activo
        ? "Registro desactivado."
        : "Registro activado.",
    );

    await cargar();
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return registros;

    return registros.filter((registro) =>
      columnas.some((columna) =>
        String(registro[columna.key] ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [registros, busqueda, columnas]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {titulo}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {descripcion}
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Nuevo
          </button>
        )}
      </div>

      <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Search size={17} className="text-slate-400" />
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar..."
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
              {editando ? "Editar registro" : "Nuevo registro"}
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
            {campos.map((campo) => (
              <label
                key={campo.key}
                className="text-sm font-medium text-slate-700"
              >
                {campo.label}
                {campo.required ? " *" : ""}

                <input
                  required={campo.required}
                  value={formulario[campo.key] ?? ""}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      [campo.key]: event.target.value,
                    }))
                  }
                  placeholder={campo.placeholder}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
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
              {columnas.map((columna) => (
                <th
                  key={columna.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {columna.label}
                </th>
              ))}

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </th>

              {puedeGestionar && (
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
                  colSpan={columnas.length + 2}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Cargando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length + 2}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No hay registros.
                </td>
              </tr>
            ) : (
              filtrados.map((registro) => (
                <tr
                  key={registro.id}
                  className="hover:bg-slate-50"
                >
                  {columnas.map((columna) => (
                    <td
                      key={columna.key}
                      className="max-w-xs px-4 py-3 text-sm text-slate-700"
                    >
                      {registro[columna.key] || "—"}
                    </td>
                  ))}

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        registro.activo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {registro.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  {puedeGestionar && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(registro)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(registro)}
                          className={[
                            "rounded-lg border p-2",
                            registro.activo
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                          ].join(" ")}
                          title={
                            registro.activo
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
