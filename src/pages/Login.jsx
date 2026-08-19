import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function iniciarSesion(event) {
    event.preventDefault();

    const usuarioLimpio = usuario.trim().toLowerCase();

    if (!usuarioLimpio || !password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const emailInterno = `${usuarioLimpio}@sigat.local`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailInterno,
        password,
      });

      if (authError) {
        throw authError;
      }

      navigate("/", { replace: true });
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Panel institucional */}
        <section className="relative hidden overflow-hidden border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(37,99,235,.22), transparent 34%), radial-gradient(circle at 82% 78%, rgba(16,185,129,.12), transparent 30%)",
            }}
          />

          <div className="relative z-10 px-12 pt-10">
            <img
              src="/logo-concejo-villavicencio-blanco.png"
              alt="Concejo Municipal de Villavicencio"
              className="mx-auto block h-auto w-full max-w-sm object-contain"
            />
          </div>

          <div className="relative z-10 px-12 pb-10">
            <div className="max-w-xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-400">
                Gestión tecnológica institucional
              </p>

              <h1 className="mt-2 text-5xl font-bold tracking-tight text-white">
                SIGAT CMV
              </h1>

              <p className="mt-2 text-xl font-medium text-slate-300">
                Sistema de Gestión de Activos Tecnológicos
              </p>

              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">
                Plataforma institucional para el control, trazabilidad y
                administración del inventario tecnológico del Concejo Municipal
                de Villavicencio.
              </p>
            </div>

            <div className="mt-6 flex h-1.5 max-w-xl overflow-hidden rounded-full">
              <div className="w-1/3 bg-blue-500" />
              <div className="w-1/3 bg-emerald-500" />
              <div className="w-1/3 bg-rose-500" />
            </div>
          </div>
        </section>

        {/* Panel login */}
        <section className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* Logo visible también en móvil */}
            <div className="mb-8 lg:hidden">
              <div className="rounded-2xl bg-slate-950 px-5 py-5 shadow-lg">
                <img
                  src="/logo-concejo-villavicencio-blanco.png"
                  alt="Concejo Municipal de Villavicencio"
                  className="mx-auto block h-auto w-full max-w-xs object-contain"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  Acceso institucional
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  Iniciar sesión
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ingresa con tu usuario asignado para acceder a SIGAT CMV.
                </p>
              </div>

              <form onSubmit={iniciarSesion} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Usuario
                  </span>

                  <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <UserRound size={19} className="shrink-0 text-slate-400" />

                    <input
                      type="text"
                      autoComplete="username"
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      placeholder="Ingresa tu usuario"
                      className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Contraseña
                  </span>

                  <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <LockKeyhole size={19} className="shrink-0 text-slate-400" />

                    <input
                      type={mostrarPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarPassword((actual) => !actual)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        mostrarPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {mostrarPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cargando && (
                    <Loader2 size={18} className="animate-spin" />
                  )}

                  {cargando ? "Ingresando..." : "Ingresar a SIGAT"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-center text-sm font-semibold text-slate-700">
                  ¿Necesitas soporte o mantenimiento?
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  Registra tu solicitud sin usuario ni contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/solicitud")}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  Registrar solicitud de servicio
                </button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5 text-center">
                <p className="text-xs leading-5 text-slate-400">
                  Concejo Municipal de Villavicencio
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Sistema de Gestión de Activos Tecnológicos
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
