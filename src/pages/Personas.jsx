import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const formularioInicial = {
  identificacion: "",
  nombres: "",
  apellidos: "",
  cargo: "",
  dependencia_id: "",
  telefono: "",
};

export default function Personas() {
  const { perfil } = useAuth();
  const puedeGestionar =
    perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";

  const [personas, setPersonas] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [resPersonas, resDependencias] = await Promise.all([
      supabase
        .from("personas")
        .select(`
          id,
          identificacion,
          nombres,
          apellidos,
          cargo,
          telefono,
          dependencia_id,
          activo,
          dependencias(nombre)
        `)
        .order("nombres", { ascending: true }),

      supabase
        .from("dependencias")
        .select("id, nombre, activo")
        .order("nombre", { ascending: true }),
    ]);

    if (resPersonas.error) {
      setError(resPersonas.error.message);
      setPersonas([]);
    } else {
      setPersonas(resPersonas.data || []);
    }

    if (resDependencias.error) {
      setError(resDependencias.error.message);
      setDependencias([]);
    } else {
      setDependencias(resDependencias.data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setFormulario(formularioInicial);
    setEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function abrirEditar(persona) {
    setFormulario({
      identificacion: persona.identificacion || "",
      nombres: persona.nombres || "",
      apellidos: persona.apellidos || "",
      cargo: persona.cargo || "",
      dependencia_id: persona.dependencia_id || "",
      telefono: persona.telefono || "",
    });

    setEditando(persona);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setFormulario(formularioInicial);
    setEditando(null);
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      identificacion: formulario.identificacion.trim() || null,
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      cargo: formulario.cargo.trim() || null,
      dependencia_id: formulario.dependencia_id || null,
      telefono: formulario.telefono.trim() || null,
    };

    let resultado;

    if (editando) {
      resultado = await supabase
        .from("personas")
        .update(payload)
        .eq("id", editando.id);
    } else {
      resultado = await supabase
        .from("personas")
        .insert(payload);
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editando
        ? "Funcionario actualizado correctamente."
        : "Funcionario creado correctamente.",
    );

    setGuardando(false);
    cerrarFormulario();
    await cargar();
  }

  async function cambiarEstado(persona) {
    setError("");
    setMensaje("");

    const { error: updateError } = await supabase
      .from("personas")
      .update({ activo: !persona.activo })
      .eq("id", persona.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje(
      persona.activo
        ? "Funcionario desactivado."
        : "Funcionario activado.",
    );

    await cargar();
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return personas;

    return personas.filter((persona) =>
      [
        persona.identificacion,
        persona.nombres,
        persona.apellidos,
        persona.cargo,
        persona.telefono,
        persona.dependencias?.nombre,
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [personas, busqueda]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Organización
        </p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Personas / Funcionarios
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Registra las personas a quienes podrán asignarse los activos tecnológicos.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Funcionarios registrados
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              La dependencia permite identificar dónde se encuentra operativamente el activo.
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Nuevo funcionario
            </button>
          )}
        </div>

        <div className="mt-6 flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search size={17} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, identificación, dependencia..."
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
                  ? "Editar funcionario"
                  : "Nuevo funcionario"}
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
                Identificación
                <input
                  value={formulario.identificacion}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      identificacion: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Nombres *
                <input
                  required
                  value={formulario.nombres}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      nombres: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Apellidos *
                <input
                  required
                  value={formulario.apellidos}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      apellidos: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Cargo
                <input
                  value={formulario.cargo}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      cargo: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Dependencia
                <select
                  value={formulario.dependencia_id}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      dependencia_id: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">
                    Sin dependencia
                  </option>

                  {dependencias
                    .filter(
                      (dependencia) =>
                        dependencia.activo ||
                        dependencia.id === formulario.dependencia_id,
                    )
                    .map((dependencia) => (
                      <option
                        key={dependencia.id}
                        value={dependencia.id}
                      >
                        {dependencia.nombre}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Teléfono
                <input
                  value={formulario.telefono}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      telefono: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
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
                {[
                  "Identificación",
                  "Nombre completo",
                  "Cargo",
                  "Dependencia",
                  "Teléfono",
                  "Estado",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {titulo}
                  </th>
                ))}

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
                    className="px-4 py-10 text-center"
                  >
                    <UserRound
                      size={34}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      No hay funcionarios registrados.
                    </p>
                  </td>
                </tr>
              ) : (
                filtradas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {persona.identificacion || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {[persona.nombres, persona.apellidos]
                        .filter(Boolean)
                        .join(" ")}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {persona.cargo || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {persona.dependencias?.nombre || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {persona.telefono || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          persona.activo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {persona.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {puedeGestionar && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEditar(persona)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(persona)}
                            className={[
                              "rounded-lg border p-2",
                              persona.activo
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                            ].join(" ")}
                            title={
                              persona.activo
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
      </section>
    </div>
  );
}
