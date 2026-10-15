import { useEffect, useState } from "react";
import {
  Bell,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function Header({ onOpenMenu }) {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const nombreCompleto = [
    perfil?.nombres,
    perfil?.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const nombreVisible =
    nombreCompleto || perfil?.usuario || "Usuario";

  const iniciales = nombreCompleto
    ? nombreCompleto
        .split(" ")
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase())
        .join("")
    : perfil?.usuario?.slice(0, 2).toUpperCase() || "US";

  async function handleLogout() {
    try {
      await cerrarSesion();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  }

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      setBuscando(false);
      return undefined;
    }
    if (!supabase) {
      setResultados([]);
      setBuscando(false);
      return undefined;
    }

    let vigente = true;
    setBuscando(true);
    const timer = window.setTimeout(async () => {
      const terminoSeguro = termino.replace(/[^\p{L}\p{N}\s.-]/gu, "").replace(/\s+/g, " ");
      if (!terminoSeguro) {
        setResultados([]);
        setBuscando(false);
        return;
      }

      const campos = ["codigo", "serial", "modelo", "nombre_equipo"];
      const filtro = campos.map((campo) => `${campo}.ilike.%${terminoSeguro}%`).join(",");
      const { data, error } = await supabase
        .from("activos")
        .select("id,codigo,serial,modelo,nombre_equipo,tipos_activo(nombre),marcas(nombre)")
        .or(filtro)
        .order("codigo", { ascending: true })
        .limit(8);

      if (!vigente) return;
      setResultados(error ? [] : data || []);
      setBuscando(false);
    }, 250);

    return () => {
      vigente = false;
      window.clearTimeout(timer);
    };
  }, [busqueda]);

  function abrirActivo(activo) {
    setMostrarResultados(false);
    setBusqueda("");
    navigate(`/activos?activo=${encodeURIComponent(activo.id)}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-20 items-center justify-between gap-3 px-3 sm:px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 md:hidden"
            aria-label="Abrir menú"
            title="Abrir menú"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-lg">
              Sistema de Gestión de Activos Tecnológicos
            </h1>

            <p className="hidden text-sm text-slate-500 sm:block">
              Control y trazabilidad del inventario tecnológico
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative hidden xl:block">
            <div className="flex w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                value={busqueda}
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setMostrarResultados(true);
                }}
                onFocus={() => setMostrarResultados(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setMostrarResultados(false);
                  if (event.key === "Enter" && resultados[0]) abrirActivo(resultados[0]);
                }}
                placeholder="Buscar activo..."
                aria-label="Buscar activo por placa, serial o modelo"
                aria-expanded={mostrarResultados}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            {mostrarResultados && busqueda.trim().length >= 2 && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {buscando ? (
                  <p className="px-4 py-3 text-sm text-slate-500">Buscando activos...</p>
                ) : resultados.length ? (
                  <ul className="max-h-96 overflow-y-auto py-1">
                    {resultados.map((activo) => (
                      <li key={activo.id}>
                        <button type="button" onClick={() => abrirActivo(activo)} className="w-full px-4 py-3 text-left transition hover:bg-blue-50">
                          <span className="block text-sm font-semibold text-blue-700">{activo.codigo}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {[activo.tipos_activo?.nombre, activo.marcas?.nombre, activo.modelo, activo.serial ? `S/N ${activo.serial}` : ""]
                              .filter(Boolean)
                              .join(" · ") || activo.nombre_equipo || "Activo tecnológico"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500">No se encontraron activos.</p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="hidden rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 sm:block"
            aria-label="Notificaciones"
          >
            <Bell size={19} />
          </button>

          <div className="ml-1 hidden text-right lg:block">
            <p className="max-w-48 truncate text-sm font-semibold text-slate-800">
              {nombreVisible}
            </p>
            <p className="text-xs font-medium text-blue-700">
              {perfil?.rol || "SIN ROL"}
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
            {iniciales}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
