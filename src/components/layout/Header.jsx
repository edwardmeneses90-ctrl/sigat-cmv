import {
  Bell,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { perfil, cerrarSesion } = useAuth();

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

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Sistema de Gestión de Activos Tecnológicos
            </h1>

            <p className="hidden text-sm text-slate-500 sm:block">
              Control y trazabilidad del inventario tecnológico
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
            <Search size={17} className="text-slate-400" />
            <span className="text-sm text-slate-400">
              Buscar activo...
            </span>
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

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
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
