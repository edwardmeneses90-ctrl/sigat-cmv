import { useMemo, useState } from "react";
import {
  Bell,
  ClipboardX,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Gauge,
  Headphones,
  History,
  Monitor,
  Settings,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const linkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition",
    isActive
      ? "bg-blue-600 text-white shadow-sm"
      : "text-slate-300 hover:bg-slate-900 hover:text-white",
  ].join(" ");

function GrupoMenu({
  titulo,
  items,
  abiertoInicial = false,
  onNavigate,
}) {
  const location = useLocation();

  const contieneRutaActiva = items.some((item) => {
    if (item.exacta) {
      return location.pathname === item.ruta;
    }

    return (
      location.pathname === item.ruta ||
      location.pathname.startsWith(`${item.ruta}/`)
    );
  });

  const [abiertoManual, setAbiertoManual] =
    useState(abiertoInicial);

  const abierto =
    abiertoManual || contieneRutaActiva;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() =>
          setAbiertoManual((actual) => !actual)
        }
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-900 hover:text-slate-300"
      >
        <span>{titulo}</span>

        {abierto ? (
          <ChevronDown size={15} />
        ) : (
          <ChevronRight size={15} />
        )}
      </button>

      {abierto && (
        <div className="mt-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icono;

            return (
              <NavLink
                key={item.nombre}
                to={item.ruta}
                end={item.exacta}
                className={linkClass}
                onClick={onNavigate}
              >
                <Icon size={18} />
                <span>{item.nombre}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}) {
  const { perfil } = useAuth();
  const rol = perfil?.rol;

  const esAdmin = rol === "ADMIN";
  const puedeGestionar =
    rol === "ADMIN" || rol === "TECNICO";

  const grupos = useMemo(() => {
    const mesaServicio = [
      {
        nombre: "Solicitudes / Tickets",
        icono: ClipboardList,
        ruta: "/solicitudes",
      },
      {
        nombre: "Soportes técnicos",
        icono: Headphones,
        ruta: "/soportes-tecnicos",
      },
      {
        nombre: "Mantenimientos",
        icono: Wrench,
        ruta: "/mantenimientos",
      },
    ];

    const inventario = [
      {
        nombre: "Activos",
        icono: Monitor,
        ruta: "/activos",
      },
      {
        nombre: "Asignaciones / Traslados",
        icono: History,
        ruta: "/movimientos",
      },
      {
        nombre: "Conceptos de baja",
        icono: ClipboardX,
        ruta: "/conceptos-baja",
      },
    ];

    const gestion = [
      {
        nombre: "Personas",
        icono: Users,
        ruta: "/personas",
      },
      {
        nombre: "Catálogos",
        icono: Database,
        ruta: "/catalogos",
      },
      ...(puedeGestionar
        ? [
            {
              nombre: "Cargue masivo",
              icono: Upload,
              ruta: "/cargue-masivo",
            },
          ]
        : []),
    ];

    const seguimiento = [
      {
        nombre: "Alertas",
        icono: Bell,
        ruta: "/alertas",
      },
      {
        nombre: "Reportes",
        icono: FileSpreadsheet,
        ruta: "/reportes",
      },
    ];

    const administracion = esAdmin
      ? [
          {
            nombre: "Configuración",
            icono: Settings,
            ruta: "/configuracion",
          },
        ]
      : [];

    return {
      mesaServicio,
      inventario,
      gestion,
      seguimiento,
      administracion,
    };
  }, [esAdmin, puedeGestionar]);

  const contenido = (
    <>
      <div className="border-b border-blue-800/70 px-5 pb-4 pt-5">
        <div className="mb-2 flex items-start justify-between gap-3 md:block">
          <img
            src="/logo-concejo-villavicencio-blanco.png"
            alt="Concejo Municipal de Villavicencio"
            className="block h-auto max-h-16 w-full max-w-[190px] object-contain md:mx-auto md:max-w-none"
          />

          <button
            type="button"
            onClick={onCloseMobile}
            className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg border border-white/20 p-2 text-white hover:bg-white/10 md:hidden"
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="text-lg font-bold tracking-wide text-white">
            SIGAT CMV
          </p>

          <p className="mt-0.5 text-[11px] leading-4 text-blue-100/80">
            Sistema de Gestión de Activos Tecnológicos
          </p>
        </div>

        <div className="mt-3 flex h-1 overflow-hidden rounded-full">
          <div className="w-1/3 bg-blue-300" />
          <div className="w-1/3 bg-emerald-400" />
          <div className="w-1/3 bg-rose-400" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <NavLink
          to="/"
          end
          className={linkClass}
          onClick={onCloseMobile}
        >
          <Gauge size={19} />
          <span>Dashboard</span>
        </NavLink>

        <div className="my-3 border-t border-white/10" />

        <GrupoMenu
          titulo="Mesa de servicio"
          items={grupos.mesaServicio}
          abiertoInicial
          onNavigate={onCloseMobile}
        />

        <GrupoMenu
          titulo="Inventario"
          items={grupos.inventario}
          abiertoInicial
          onNavigate={onCloseMobile}
        />

        <GrupoMenu
          titulo="Gestión"
          items={grupos.gestion}
          onNavigate={onCloseMobile}
        />

        <GrupoMenu
          titulo="Seguimiento"
          items={grupos.seguimiento}
          onNavigate={onCloseMobile}
        />

        {grupos.administracion.length > 0 && (
          <GrupoMenu
            titulo="Administración"
            items={grupos.administracion}
            onNavigate={onCloseMobile}
          />
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="rounded-lg bg-blue-950/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
            Sesión activa
          </p>

          <p className="mt-1 text-xs font-medium text-blue-50">
            Rol: {rol || "—"}
          </p>
        </div>

        <p className="mt-3 text-center text-[10px] text-blue-200/50">
          Concejo Municipal de Villavicencio
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-blue-900 bg-blue-950 text-white md:flex">
        {contenido}
      </aside>

      {/* Fondo oscuro móvil */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Drawer móvil */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-72 flex-col border-r border-blue-800 bg-blue-950 text-white shadow-2xl transition-transform duration-300 ease-out md:hidden",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
        aria-hidden={!mobileOpen}
      >
        {contenido}
      </aside>
    </>
  );
}
