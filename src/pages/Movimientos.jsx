import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Search,
  Send,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const formularioInicial = {
  activo_id: "",
  tipo_movimiento: "ASIGNACION",
  dependencia_destino_id: "",
  responsable_destino_id: "",
  observaciones: "",
};

function nombrePersona(persona) {
  if (!persona) return "Sin asignar";

  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ");
}

function etiquetaTipo(tipo) {
  const mapa = {
    ASIGNACION: "Asignación",
    TRASLADO: "Traslado",
    DEVOLUCION: "Devolución",
  };

  return mapa[tipo] || tipo;
}

export default function Movimientos() {
  const { perfil } = useAuth();
  const puedeGestionar =
    perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";

  const [activos, setActivos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [formulario, setFormulario] = useState(formularioInicial);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [
      resActivos,
      resPersonas,
      resDependencias,
      resMovimientos,
    ] = await Promise.all([
      supabase
        .from("activos")
        .select(`
          id,
          codigo,
          modelo,
          serial,
          estado,
          dependencia_id,
          responsable_id,
          tipos_activo(nombre),
          marcas(nombre),
          dependencias(nombre),
          personas(nombres, apellidos)
        `)
        .order("codigo", { ascending: true }),

      supabase
        .from("personas")
        .select(
          "id, nombres, apellidos, dependencia_id, activo",
        )
        .order("nombres", { ascending: true }),

      supabase
        .from("dependencias")
        .select("id, nombre, activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("movimientos_activo")
        .select(`
          id,
          tipo_movimiento,
          fecha_movimiento,
          observaciones,
          activos(codigo),
          dependencia_origen:dependencias!movimientos_activo_dependencia_origen_id_fkey(nombre),
          dependencia_destino:dependencias!movimientos_activo_dependencia_destino_id_fkey(nombre),
          responsable_origen:personas!movimientos_activo_responsable_origen_id_fkey(nombres, apellidos),
          responsable_destino:personas!movimientos_activo_responsable_destino_id_fkey(nombres, apellidos)
        `)
        .order("fecha_movimiento", { ascending: false })
        .limit(100),
    ]);

    const errores = [
      resActivos.error,
      resPersonas.error,
      resDependencias.error,
      resMovimientos.error,
    ].filter(Boolean);

    if (errores.length) {
      setError(errores[0].message);
    }

    setActivos(resActivos.data || []);
    setPersonas(resPersonas.data || []);
    setDependencias(resDependencias.data || []);
    setMovimientos(resMovimientos.data || []);

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const activoSeleccionado = activos.find(
    (item) => item.id === formulario.activo_id,
  );


  const activosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return activos;

    return activos.filter((activo) =>
      [
        activo.codigo,
        activo.serial,
        activo.modelo,
        activo.tipos_activo?.nombre,
        activo.marcas?.nombre,
      ].some((valor) =>
        String(valor ?? "").toLowerCase().includes(texto),
      ),
    ).slice(0, 50);
  }, [activos, busqueda]);

  function actualizarCampo(key, valor) {
    setFormulario((actual) => ({
      ...actual,
      [key]: valor,
    }));
  }

  function cambiarTipo(tipo) {
    setFormulario((actual) => ({
      ...actual,
      tipo_movimiento: tipo,
      dependencia_destino_id:
        tipo === "DEVOLUCION"
          ? ""
          : actual.dependencia_destino_id,
      responsable_destino_id:
        tipo === "DEVOLUCION"
          ? ""
          : actual.responsable_destino_id,
    }));
  }

  function cambiarResponsable(personaId) {
    const persona = personas.find(
      (item) => item.id === personaId,
    );

    setFormulario((actual) => ({
      ...actual,
      responsable_destino_id: personaId,
      dependencia_destino_id:
        persona?.dependencia_id ||
        actual.dependencia_destino_id ||
        "",
    }));
  }

  async function guardar(event) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    if (!formulario.activo_id) {
      setError("Debe seleccionar un activo.");
      setGuardando(false);
      return;
    }

    if (
      formulario.tipo_movimiento !== "DEVOLUCION" &&
      !formulario.responsable_destino_id
    ) {
      setError("Debe seleccionar un funcionario destino.");
      setGuardando(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "registrar_movimiento_activo",
      {
        p_activo_id: formulario.activo_id,
        p_tipo_movimiento:
          formulario.tipo_movimiento,
        p_dependencia_destino_id:
          formulario.dependencia_destino_id || null,
        p_responsable_destino_id:
          formulario.responsable_destino_id || null,
        p_motivo: null,
        p_observaciones:
          formulario.observaciones || null,
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      `${etiquetaTipo(
        formulario.tipo_movimiento,
      )} registrada correctamente.`,
    );

    setFormulario(formularioInicial);
    setGuardando(false);

    await cargar();
  }

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return movimientos;

    return movimientos.filter((mov) =>
      [
        mov.activos?.codigo,
        mov.tipo_movimiento,
        mov.observaciones,
        mov.dependencia_origen?.nombre,
        mov.dependencia_destino?.nombre,
        nombrePersona(mov.responsable_origen),
        nombrePersona(mov.responsable_destino),
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [movimientos, busqueda]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Trazabilidad
        </p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Asignaciones y traslados
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Registra cambios de responsable y dependencia sin perder el historial del activo.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {puedeGestionar && (
          <form
            onSubmit={guardar}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1"
          >
            <h3 className="text-lg font-bold text-slate-900">
              Nuevo movimiento
            </h3>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Activo *
                <input
                  type="text"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar por placa, serial o modelo..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                />

                <select
                  required
                  value={formulario.activo_id}
                  onChange={(event) =>
                    actualizarCampo(
                      "activo_id",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Seleccionar activo
                  </option>

                  {activosFiltrados.map((activo) => (
                    <option
                      key={activo.id}
                      value={activo.id}
                    >
                      {activo.codigo} —{" "}
                      {activo.modelo || activo.tipos_activo?.nombre || ""}
                    </option>
                  ))}
                </select>
              </label>

              {activoSeleccionado && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p>
                    <span className="font-semibold">
                      Dependencia actual:
                    </span>{" "}
                    {activoSeleccionado.dependencias?.nombre ||
                      "Sin dependencia"}
                  </p>

                  <p className="mt-1">
                    <span className="font-semibold">
                      Responsable actual:
                    </span>{" "}
                    {nombrePersona(
                      activoSeleccionado.personas,
                    )}
                  </p>
                </div>
              )}

              <label className="block text-sm font-medium text-slate-700">
                Tipo de movimiento *
                <select
                  value={formulario.tipo_movimiento}
                  onChange={(event) =>
                    cambiarTipo(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="ASIGNACION">
                    Asignación
                  </option>
                  <option value="TRASLADO">
                    Traslado
                  </option>
                  <option value="DEVOLUCION">
                    Devolución
                  </option>
                </select>
              </label>

              {formulario.tipo_movimiento !== "DEVOLUCION" && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Dependencia destino
                    <select
                      value={formulario.dependencia_destino_id}
                      onChange={(event) =>
                        actualizarCampo(
                          "dependencia_destino_id",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        Seleccionar dependencia
                      </option>

                      {dependencias
                        .filter((item) => item.activo)
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.nombre}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Funcionario destino *
                    <select
                      required
                      value={formulario.responsable_destino_id}
                      onChange={(event) =>
                        cambiarResponsable(
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        Seleccionar funcionario
                      </option>

                      {personas
                        .filter((item) => item.activo)
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.nombres} {item.apellidos}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}

              <label className="block text-sm font-medium text-slate-700">
                Observaciones
                <textarea
                  rows="4"
                  value={formulario.observaciones}
                  onChange={(event) =>
                    actualizarCampo(
                      "observaciones",
                      event.target.value,
                    )
                  }
                  placeholder="Escribe aquí cualquier detalle del movimiento..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {mensaje && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 size={17} />
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send size={17} />
                {guardando
                  ? "Registrando..."
                  : "Registrar movimiento"}
              </button>
            </div>
          </form>
        )}

        <section
          className={[
            "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
            puedeGestionar
              ? "xl:col-span-2"
              : "xl:col-span-3",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Historial de movimientos
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Últimos 100 movimientos registrados.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Search
                size={17}
                className="text-slate-400"
              />

              <input
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar placa, persona..."
                className="bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Placa",
                    "Movimiento",
                    "Origen",
                    "Destino",
                    "Observaciones",
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

              <tbody className="divide-y divide-slate-100 bg-white">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No hay movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((mov) => (
                    <tr key={mov.id}>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(
                          mov.fecha_movimiento,
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                        {mov.activos?.codigo || "—"}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {etiquetaTipo(
                            mov.tipo_movimiento,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        <p>
                          {mov.dependencia_origen?.nombre ||
                            "Sin dependencia"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {nombrePersona(
                            mov.responsable_origen,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        <p>
                          {mov.dependencia_destino?.nombre ||
                            "Sin dependencia"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {nombrePersona(
                            mov.responsable_destino,
                          )}
                        </p>
                      </td>

                      <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                        {mov.observaciones || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
