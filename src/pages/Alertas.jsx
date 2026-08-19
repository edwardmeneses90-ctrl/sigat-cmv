import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  construirAlertas,
  formatearFechaCorta,
  resumenAlertas,
  textoVencimiento,
} from "../lib/alertas";

const NIVEL_ESTILOS = {
  ROJO: {
    badge: "bg-red-100 text-red-700",
    borde: "border-red-200",
    fondo: "bg-red-50",
    texto: "Crítica",
  },
  AMARILLO: {
    badge: "bg-amber-100 text-amber-700",
    borde: "border-amber-200",
    fondo: "bg-amber-50",
    texto: "Próxima",
  },
  AZUL: {
    badge: "bg-blue-100 text-blue-700",
    borde: "border-blue-200",
    fondo: "bg-blue-50",
    texto: "Preventiva",
  },
};

export default function Alertas() {
  const [activos, setActivos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [nivel, setNivel] = useState("TODOS");
  const [categoria, setCategoria] = useState("TODAS");

  async function cargar() {
    setCargando(true);
    setError("");

    const [resActivos, resMantenimientos, resNovedades] =
      await Promise.all([
        supabase.from("activos").select(`
          id,
          codigo,
          nombre_equipo,
          estado,
          responsable_id,
          dependencia_id,
          fecha_inicio_licencia_antivirus,
          fecha_ultimo_mantenimiento,
          fecha_fin_garantia,
          tipos_activo(nombre),
          dependencias(nombre)
        `),

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
          .in("tipo", [
            "FALLA",
            "DANO",
            "GARANTIA",
            "PERDIDA",
            "HURTO",
          ])
          .order("fecha_novedad", { ascending: false })
          .limit(100),
      ]);

    const errores = [
      resActivos.error,
      resMantenimientos.error,
      resNovedades.error,
    ].filter(Boolean);

    if (errores.length) {
      setError(errores[0].message);
    }

    setActivos(resActivos.data || []);
    setMantenimientos(resMantenimientos.data || []);
    setNovedades(resNovedades.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const alertas = useMemo(
    () =>
      construirAlertas({
        activos,
        mantenimientos,
        novedades,
      }),
    [activos, mantenimientos, novedades],
  );

  const resumen = useMemo(
    () => resumenAlertas(alertas),
    [alertas],
  );

  const categorias = useMemo(
    () =>
      [...new Set(alertas.map((item) => item.categoria))].sort(),
    [alertas],
  );

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return alertas.filter((item) => {
      if (nivel !== "TODOS" && item.nivel !== nivel) {
        return false;
      }

      if (
        categoria !== "TODAS" &&
        item.categoria !== categoria
      ) {
        return false;
      }

      if (!texto) return true;

      return [
        item.placa,
        item.equipo,
        item.dependencia,
        item.categoria,
        item.titulo,
        item.detalle,
      ].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [alertas, busqueda, nivel, categoria]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Control preventivo
        </p>

        <div className="mt-1 flex items-center gap-3">
          <Bell className="text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Alertas
          </h1>
        </div>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Vencimientos, mantenimiento, garantía e inconsistencias que requieren seguimiento.
        </p>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumen
          titulo="Total alertas"
          valor={cargando ? "..." : resumen.total}
          Icon={Bell}
        />
        <Resumen
          titulo="Críticas"
          valor={cargando ? "..." : resumen.rojas}
          Icon={ShieldAlert}
        />
        <Resumen
          titulo="Próximas"
          valor={cargando ? "..." : resumen.amarillas}
          Icon={TriangleAlert}
        />
        <Resumen
          titulo="Preventivas"
          valor={cargando ? "..." : resumen.azules}
          Icon={CalendarClock}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search size={17} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar placa, equipo, dependencia o alerta..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="ROJO">Críticas</option>
            <option value="AMARILLO">Próximas</option>
            <option value="AZUL">Preventivas</option>
          </select>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="TODAS">Todas las categorías</option>
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Nivel",
                  "Placa",
                  "Equipo",
                  "Categoría",
                  "Alerta",
                  "Fecha",
                  "Estado",
                  "Dependencia",
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
                    colSpan="8"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Calculando alertas...
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No hay alertas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtradas.map((item) => {
                  const estilo = NIVEL_ESTILOS[item.nivel];

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estilo.badge}`}
                        >
                          {estilo.texto}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-blue-700">
                        {item.placa}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {item.equipo}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.categoria}
                      </td>

                      <td className="max-w-sm px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.titulo}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.detalle}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {formatearFechaCorta(item.fecha)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${estilo.fondo} ${estilo.borde} border`}
                        >
                          {item.dias === null
                            ? "Requiere atención"
                            : textoVencimiento(item.dias)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.dependencia}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Resumen({ titulo, valor, Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {valor}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-blue-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
