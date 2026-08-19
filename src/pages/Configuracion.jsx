import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  ["ADMIN", "Administrador"],
  ["TECNICO", "Técnico"],
  ["CONSULTA", "Consulta"],
];

const inicial = {
  usuario: "",
  nombres: "",
  apellidos: "",
  rol: "CONSULTA",
  password: "",
};

function etiquetaRol(valor) {
  return ROLES.find(([key]) => key === valor)?.[1] || valor;
}

export default function Configuracion() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "ADMIN";

  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [formulario, setFormulario] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarUsuarios() {
    setCargando(true);
    setError("");

    const { data, error: selectError } =
      await supabase
        .from("perfiles")
        .select(`
          id,
          usuario,
          nombres,
          apellidos,
          rol,
          activo,
          created_at
        `)
        .order("usuario", { ascending: true });

    if (selectError) {
      setError(selectError.message);
      setUsuarios([]);
    } else {
      setUsuarios(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios();
    }
  }, [esAdmin]);

  function actualizar(key, value) {
    setFormulario((actual) => ({
      ...actual,
      [key]: value,
    }));
  }

  async function crearUsuario(event) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    const { data, error: fnError } =
      await supabase.functions.invoke(
        "crear-usuario",
        {
          body: {
            usuario: formulario.usuario
              .trim()
              .toLowerCase(),
            nombres:
              formulario.nombres.trim(),
            apellidos:
              formulario.apellidos.trim(),
            rol: formulario.rol,
            password: formulario.password,
          },
        },
      );

    if (fnError) {
      setError(
        fnError.message ||
          "No se pudo crear el usuario.",
      );
      setGuardando(false);
      return;
    }

    if (data?.error) {
      setError(data.error);
      setGuardando(false);
      return;
    }

    setMensaje(
      `Usuario ${data?.usuario || formulario.usuario} creado correctamente.`,
    );

    setFormulario(inicial);
    setMostrarNuevo(false);
    setGuardando(false);

    await cargarUsuarios();
  }

  async function cambiarRol(usuario, nuevoRol) {
    setError("");
    setMensaje("");

    if (usuario.id === perfil?.id && nuevoRol !== "ADMIN") {
      setError(
        "No puedes quitarte a ti mismo el rol ADMIN desde esta pantalla.",
      );
      return;
    }

    const { error: updateError } = await supabase
      .from("perfiles")
      .update({ rol: nuevoRol })
      .eq("id", usuario.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje(
      `Rol de ${usuario.usuario} actualizado a ${etiquetaRol(nuevoRol)}.`,
    );

    await cargarUsuarios();
  }

  async function cambiarEstado(usuario) {
    setError("");
    setMensaje("");

    if (usuario.id === perfil?.id) {
      setError(
        "No puedes desactivar tu propio usuario mientras estás conectado.",
      );
      return;
    }

    const nuevoEstado = !usuario.activo;

    const { error: updateError } = await supabase
      .from("perfiles")
      .update({
        activo: nuevoEstado,
      })
      .eq("id", usuario.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje(
      nuevoEstado
        ? `Usuario ${usuario.usuario} activado.`
        : `Usuario ${usuario.usuario} desactivado.`,
    );

    await cargarUsuarios();
  }

  const filtrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) return usuarios;

    return usuarios.filter((item) =>
      [
        item.usuario,
        item.nombres,
        item.apellidos,
        item.rol,
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      ),
    );
  }, [usuarios, busqueda]);

  if (!esAdmin) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-amber-700" />
          <div>
            <h1 className="font-bold text-amber-900">
              Acceso restringido
            </h1>
            <p className="mt-1 text-sm text-amber-800">
              Solo los administradores pueden gestionar usuarios y roles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Administración
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Configuración
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Administra usuarios, roles y acceso a SIGAT CMV.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-xl font-bold text-slate-900">
                Usuarios y roles
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Los usuarios desactivados conservan su historial.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormulario(inicial);
              setMostrarNuevo(true);
              setError("");
              setMensaje("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>

        <div className="mt-6 flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search
            size={17}
            className="text-slate-400"
          />

          <input
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
            placeholder="Buscar usuario, nombre o rol..."
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

        {mostrarNuevo && (
          <form
            onSubmit={crearUsuario}
            className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Nuevo usuario
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  El usuario iniciará sesión con usuario y contraseña.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarNuevo(false)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Campo
                label="Usuario *"
                value={formulario.usuario}
                onChange={(v) =>
                  actualizar(
                    "usuario",
                    v.toLowerCase(),
                  )
                }
                required
                placeholder="tecnico1"
              />

              <Campo
                label="Nombres *"
                value={formulario.nombres}
                onChange={(v) =>
                  actualizar("nombres", v)
                }
                required
              />

              <Campo
                label="Apellidos"
                value={formulario.apellidos}
                onChange={(v) =>
                  actualizar("apellidos", v)
                }
              />

              <label className="text-sm font-medium text-slate-700">
                Rol *
                <select
                  value={formulario.rol}
                  onChange={(event) =>
                    actualizar(
                      "rol",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  {ROLES.map(([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Contraseña *
                <div className="relative mt-2">
                  <KeyRound
                    size={17}
                    className="absolute left-3 top-3 text-slate-400"
                  />

                  <input
                    type="password"
                    required
                    minLength="8"
                    value={formulario.password}
                    onChange={(event) =>
                      actualizar(
                        "password",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setMostrarNuevo(false)
                }
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
                  ? "Creando..."
                  : "Crear usuario"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Usuario",
                  "Nombre",
                  "Rol",
                  "Estado",
                  "Creado",
                  "Acciones",
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
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No hay usuarios.
                  </td>
                </tr>
              ) : (
                filtrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      {usuario.usuario}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {[usuario.nombres, usuario.apellidos]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={usuario.rol}
                        onChange={(event) =>
                          cambiarRol(
                            usuario,
                            event.target.value,
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      >
                        {ROLES.map(([key, label]) => (
                          <option
                            key={key}
                            value={key}
                          >
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          usuario.activo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {usuario.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-500">
                      {usuario.created_at
                        ? new Date(
                            usuario.created_at,
                          ).toLocaleDateString(
                            "es-CO",
                          )
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          cambiarEstado(usuario)
                        }
                        disabled={
                          usuario.id === perfil?.id
                        }
                        className={[
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                          usuario.activo
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                          usuario.id === perfil?.id
                            ? "cursor-not-allowed opacity-40"
                            : "",
                        ].join(" ")}
                      >
                        {usuario.activo
                          ? "Desactivar"
                          : "Activar"}
                      </button>
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
  required = false,
  placeholder = "",
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}

      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      />
    </label>
  );
}
