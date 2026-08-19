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

function GrupoMenu({ titulo, items, abiertoInicial = false }) {
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

  const [abiertoManual, setAbiertoManual] = useState(abiertoInicial);

  const abierto = abiertoManual || contieneRutaActiva;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setAbiertoManual((actual) => !actual)}
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

export default function Sidebar() {
  const { perfil } = useAuth();
  const rol = perfil?.rol;

  const esAdmin = rol === "ADMIN";
  const puedeGestionar = rol === "ADMIN" || rol === "TECNICO";

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

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white md:flex">
      <div className="border-b border-slate-800 px-5 pb-4 pt-5">
        <img
          src="/logo-concejo-villavicencio-blanco.png"
          alt="Concejo Municipal de Villavicencio"
          className="mx-auto block h-auto max-h-16 w-full object-contain"
        />

        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="text-lg font-bold tracking-wide text-white">
            SIGAT CMV
          </p>

          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
            Sistema de Gestión de Activos Tecnológicos
          </p>
        </div>

        <div className="mt-3 flex h-1 overflow-hidden rounded-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-emerald-500" />
          <div className="w-1/3 bg-rose-500" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <NavLink to="/" end className={linkClass}>
          <Gauge size={19} />
          <span>Dashboard</span>
        </NavLink>

        <div className="my-3 border-t border-slate-800" />

        <GrupoMenu
          titulo="Mesa de servicio"
          items={grupos.mesaServicio}
          abiertoInicial
        />

        <GrupoMenu
          titulo="Inventario"
          items={grupos.inventario}
          abiertoInicial
        />

        <GrupoMenu
          titulo="Gestión"
          items={grupos.gestion}
        />

        <GrupoMenu
          titulo="Seguimiento"
          items={grupos.seguimiento}
        />

        {grupos.administracion.length > 0 && (
          <GrupoMenu
            titulo="Administración"
            items={grupos.administracion}
          />
        )}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <div className="rounded-lg bg-slate-900 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Sesión activa
          </p>

          <p className="mt-1 text-xs font-medium text-slate-300">
            Rol: {rol || "—"}
          </p>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-600">
          Concejo Municipal de Villavicencio
        </p>
      </div>
    </aside>
  );
}
