import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Boxes,
  CheckCircle2,
  Monitor,
  PackageCheck,
  Wrench,
} from "lucide-react";
import KpiCard from "../components/dashboard/KpiCard";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  construirAlertas,
  resumenAlertas,
} from "../lib/alertas";

function formatearFecha(valor) {
  if (!valor) return "—";

  return new Date(valor).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function etiquetaMovimiento(tipo) {
  const mapa = {
    ASIGNACION: "Asignación",
    TRASLADO: "Traslado",
    DEVOLUCION: "Devolución",
  };

  return mapa[tipo] || tipo;
}

function etiquetaNovedad(tipo) {
  const mapa = {
    FALLA: "Falla",
    DANO: "Daño",
    GARANTIA: "Garantía",
    PERDIDA: "Pérdida",
    HURTO: "Hurto",
    PRESTAMO: "Préstamo",
    DEVOLUCION: "Devolución",
    CAMBIO_COMPONENTE: "Cambio de componente",
    OTRO: "Otro",
  };

  return mapa[tipo] || tipo;
}

export default function Dashboard() {
  const [activos, setActivos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [mantenimientosAlertas, setMantenimientosAlertas] = useState([]);
  const [novedadesAlertas, setNovedadesAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarDashboard() {
    setCargando(true);
    setError("");

    const [
      resActivos,
      resMovimientos,
      resMantenimientos,
      resNovedades,
      resMantenimientosAlertas,
      resNovedadesAlertas,
    ] = await Promise.all([
      supabase
        .from("activos")
        .select(`
          id,
          codigo,
          estado,
          tipo_activo_id,
          dependencia_id,
          responsable_id,
          nombre_equipo,
          fecha_inicio_licencia_antivirus,
          fecha_ultimo_mantenimiento,
          fecha_fin_garantia,
          tipos_activo(nombre),
          dependencias(nombre)
        `),

      supabase
        .from("movimientos_activo")
        .select(`
          id,
          tipo_movimiento,
          fecha_movimiento,
          observaciones,
          activos(codigo)
        `)
        .order("fecha_movimiento", { ascending: false })
        .limit(5),

      supabase
        .from("mantenimientos")
        .select(`
          id,
          tipo,
          fecha_mantenimiento,
          tecnico_proveedor,
          trabajo_realizado,
          activos(codigo)
        `)
        .order("fecha_mantenimiento", { ascending: false })
        .limit(5),

      supabase
        .from("novedades")
        .select(`
          id,
          tipo,
          fecha_novedad,
          descripcion,
          activos(codigo)
        `)
        .order("fecha_novedad", { ascending: false })
        .limit(5),

      supabase
        .from("mantenimientos")
        .select(`
          id,
          activo_id,
          tipo,
          fecha_mantenimiento,
          proximo_mantenimiento,
          activos(
            id,
            codigo,
            nombre_equipo,
            estado,
            dependencia_id,
            responsable_id,
            tipos_activo(nombre),
            dependencias(nombre)
          )
        `)
        .not("proximo_mantenimiento", "is", null)
        .order("fecha_mantenimiento", { ascending: false }),

      supabase
        .from("novedades")
        .select(`
          id,
          activo_id,
          tipo,
          fecha_novedad,
          descripcion,
          activos(
            id,
            codigo,
            nombre_equipo,
            estado,
            dependencia_id,
            responsable_id,
            tipos_activo(nombre),
            dependencias(nombre)
          )
        `)
        .in("tipo", ["FALLA","DANO","GARANTIA","PERDIDA","HURTO"])
        .order("fecha_novedad", { ascending: false })
        .limit(100),
    ]);

    const errores = [
      resActivos.error,
      resMovimientos.error,
      resMantenimientos.error,
      resNovedades.error,
      resMantenimientosAlertas.error,
      resNovedadesAlertas.error,
    ].filter(Boolean);

    if (errores.length) {
      setError(errores[0].message);
    }

    setActivos(resActivos.data || []);
    setMovimientos(resMovimientos.data || []);
    setMantenimientos(resMantenimientos.data || []);
    setNovedades(resNovedades.data || []);
    setMantenimientosAlertas(resMantenimientosAlertas.data || []);
    setNovedadesAlertas(resNovedadesAlertas.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  const indicadores = useMemo(() => {
    return [
      {
        titulo: "Total activos",
        valor: activos.length,
        Icon: Boxes,
      },
      {
        titulo: "Disponibles",
        valor: activos.filter(
          (activo) => activo.estado === "DISPONIBLE",
        ).length,
        Icon: PackageCheck,
      },
      {
        titulo: "Asignados",
        valor: activos.filter(
          (activo) => activo.estado === "ASIGNADO",
        ).length,
        Icon: CheckCircle2,
      },
      {
        titulo: "En mantenimiento",
        valor: activos.filter(
          (activo) =>
            activo.estado === "EN_MANTENIMIENTO",
        ).length,
        Icon: Wrench,
      },
    ];
  }, [activos]);

  const porTipo = useMemo(() => {
    const conteo = {};

    activos.forEach((activo) => {
      const nombre =
        activo.tipos_activo?.nombre || "Sin tipo";

      conteo[nombre] = (conteo[nombre] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [activos]);

  const porDependencia = useMemo(() => {
    const conteo = {};

    activos.forEach((activo) => {
      const nombre =
        activo.dependencias?.nombre || "Sin dependencia";

      conteo[nombre] = (conteo[nombre] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [activos]);

  const actividad = useMemo(() => {
    const eventos = [
      ...movimientos.map((item) => ({
        id: `mov-${item.id}`,
        fecha: item.fecha_movimiento,
        tipo: "Movimiento",
        placa: item.activos?.codigo || "—",
        titulo: etiquetaMovimiento(
          item.tipo_movimiento,
        ),
        detalle: item.observaciones || "Sin observación",
      })),

      ...mantenimientos.map((item) => ({
        id: `mant-${item.id}`,
        fecha: `${item.fecha_mantenimiento}T12:00:00`,
        tipo: "Mantenimiento",
        placa: item.activos?.codigo || "—",
        titulo:
          item.tipo === "PREVENTIVO"
            ? "Mantenimiento preventivo"
            : "Mantenimiento correctivo",
        detalle:
          item.trabajo_realizado ||
          item.tecnico_proveedor ||
          "Sin detalle",
      })),

      ...novedades.map((item) => ({
        id: `nov-${item.id}`,
        fecha: item.fecha_novedad,
        tipo: "Novedad",
        placa: item.activos?.codigo || "—",
        titulo: etiquetaNovedad(item.tipo),
        detalle: item.descripcion || "Sin detalle",
      })),
    ];

    return eventos
      .sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime(),
      )
      .slice(0, 10);
  }, [movimientos, mantenimientos, novedades]);


  const alertas = useMemo(
    () =>
      construirAlertas({
        activos,
        mantenimientos: mantenimientosAlertas,
        novedades: novedadesAlertas,
      }),
    [activos, mantenimientosAlertas, novedadesAlertas],
  );

  const resumenDeAlertas = useMemo(
    () => resumenAlertas(alertas),
    [alertas],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Resumen general
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Estado actual del inventario tecnológico de SIGAT CMV.
        </p>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((item) => (
          <KpiCard
            key={item.titulo}
            titulo={item.titulo}
            valor={cargando ? "..." : item.valor}
            Icon={item.Icon}
          />
        ))}
      </section>


      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Bell size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Alertas y vencimientos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Seguimiento preventivo del inventario tecnológico.
              </p>
            </div>
          </div>

          <Link
            to="/alertas"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ver todas las alertas
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AlertaResumen
            titulo="Críticas"
            valor={cargando ? "..." : resumenDeAlertas.rojas}
            clase="border-red-200 bg-red-50 text-red-700"
          />
          <AlertaResumen
            titulo="Próximas"
            valor={cargando ? "..." : resumenDeAlertas.amarillas}
            clase="border-amber-200 bg-amber-50 text-amber-700"
          />
          <AlertaResumen
            titulo="Preventivas"
            valor={cargando ? "..." : resumenDeAlertas.azules}
            clase="border-blue-200 bg-blue-50 text-blue-700"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Monitor
              size={19}
              className="text-blue-600"
            />

            <h2 className="text-lg font-bold text-slate-900">
              Activos por tipo
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {cargando ? (
              <p className="text-sm text-slate-500">
                Cargando...
              </p>
            ) : porTipo.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay activos registrados.
              </p>
            ) : (
              porTipo.map((item) => (
                <div
                  key={item.nombre}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {item.nombre}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">
                    {item.cantidad}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Boxes
              size={19}
              className="text-blue-600"
            />

            <h2 className="text-lg font-bold text-slate-900">
              Activos por dependencia
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {cargando ? (
              <p className="text-sm text-slate-500">
                Cargando...
              </p>
            ) : porDependencia.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay información disponible.
              </p>
            ) : (
              porDependencia.map((item) => (
                <div
                  key={item.nombre}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {item.nombre}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">
                    {item.cantidad}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity
            size={19}
            className="text-blue-600"
          />

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Actividad reciente
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Movimientos, mantenimientos y novedades más recientes.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Fecha",
                  "Placa",
                  "Categoría",
                  "Evento",
                  "Detalle",
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
                    colSpan="5"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Cargando actividad...
                  </td>
                </tr>
              ) : actividad.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Todavía no hay actividad registrada.
                  </td>
                </tr>
              ) : (
                actividad.map((evento) => (
                  <tr key={evento.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {formatearFecha(evento.fecha)}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                      {evento.placa}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {evento.tipo}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {evento.titulo}
                    </td>

                    <td className="max-w-md px-4 py-3 text-sm text-slate-600">
                      {evento.detalle}
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


function AlertaResumen({ titulo, valor, clase }) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${clase}`}>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
    </div>
  );
}
