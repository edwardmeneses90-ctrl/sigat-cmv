import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const ESTADOS = [
  ["DISPONIBLE", "Disponible"],
  ["ASIGNADO", "Asignado"],
  ["EN_MANTENIMIENTO", "En mantenimiento"],
  ["EN_GARANTIA", "En garantía"],
  ["EN_PRESTAMO", "En préstamo"],
  ["PENDIENTE_BAJA", "Pendiente de baja"],
  ["DADO_DE_BAJA", "Dado de baja"],
  ["PERDIDO", "Perdido"],
  ["HURTADO", "Hurtado"],
];

function etiquetaEstado(valor) {
  return (
    ESTADOS.find(([key]) => key === valor)?.[1] ||
    valor
  );
}

function nombrePersona(persona) {
  if (!persona) return "";

  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ");
}

function escaparCSV(valor) {
  const texto = String(valor ?? "");

  if (
    texto.includes(",") ||
    texto.includes('"') ||
    texto.includes("\n")
  ) {
    return `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
}

export default function Reportes() {
  const [activos, setActivos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [dependencias, setDependencias] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [dependencia, setDependencia] = useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [
      resActivos,
      resTipos,
      resDependencias,
    ] = await Promise.all([
      supabase
        .from("activos")
        .select(`
          id,
          codigo,
          tipo_activo_id,
          marca_id,
          modelo,
          serial,
          nombre_equipo,
          procesador,
          memoria_ram,
          almacenamiento,
          sistema_operativo,
          direccion_ip,
          direccion_mac,
          fecha_compra,
          proveedor,
          numero_factura,
          valor_compra,
          fecha_fin_garantia,
          estado,
          dependencia_id,
          responsable_id,
          observaciones,
          tipos_activo(nombre),
          marcas(nombre),
          dependencias(nombre),
          personas(nombres, apellidos)
        `)
        .order("codigo", { ascending: true }),

      supabase
        .from("tipos_activo")
        .select("id, nombre")
        .order("nombre"),

      supabase
        .from("dependencias")
        .select("id, nombre")
        .order("nombre"),
    ]);

    const errores = [
      resActivos.error,
      resTipos.error,
      resDependencias.error,
    ].filter(Boolean);

    if (errores.length) {
      setError(errores[0].message);
    }

    setActivos(resActivos.data || []);
    setTipos(resTipos.data || []);
    setDependencias(resDependencias.data || []);

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return activos.filter((activo) => {
      const coincideTexto =
        !texto ||
        [
          activo.codigo,
          activo.serial,
          activo.modelo,
          activo.nombre_equipo,
          activo.marcas?.nombre,
          activo.tipos_activo?.nombre,
          activo.dependencias?.nombre,
          nombrePersona(activo.personas),
          activo.procesador,
          activo.memoria_ram,
          activo.almacenamiento,
        ].some((valor) =>
          String(valor ?? "")
            .toLowerCase()
            .includes(texto),
        );

      const coincideTipo =
        !tipo || activo.tipo_activo_id === tipo;

      const coincideEstado =
        !estado || activo.estado === estado;

      const coincideDependencia =
        !dependencia ||
        activo.dependencia_id === dependencia;

      return (
        coincideTexto &&
        coincideTipo &&
        coincideEstado &&
        coincideDependencia
      );
    });
  }, [
    activos,
    busqueda,
    tipo,
    estado,
    dependencia,
  ]);

  const resumen = useMemo(() => {
    return {
      total: filtrados.length,
      asignados: filtrados.filter(
        (item) => item.estado === "ASIGNADO",
      ).length,
      disponibles: filtrados.filter(
        (item) => item.estado === "DISPONIBLE",
      ).length,
      mantenimiento: filtrados.filter(
        (item) =>
          item.estado === "EN_MANTENIMIENTO",
      ).length,
    };
  }, [filtrados]);

  function limpiarFiltros() {
    setBusqueda("");
    setTipo("");
    setEstado("");
    setDependencia("");
  }

  function exportarCSV() {
    const encabezados = [
      "Placa de inventario",
      "Tipo",
      "Marca",
      "Modelo",
      "Serial",
      "Nombre del equipo",
      "Procesador",
      "Memoria RAM",
      "Almacenamiento",
      "Sistema operativo",
      "Dirección IP",
      "Dirección MAC",
      "Estado",
      "Dependencia",
      "Responsable",
      "Fecha de compra",
      "Proveedor",
      "Número de factura",
      "Valor de compra",
      "Fin de garantía",
      "Observaciones",
    ];

    const filas = filtrados.map((activo) => [
      activo.codigo,
      activo.tipos_activo?.nombre || "",
      activo.marcas?.nombre || "",
      activo.modelo || "",
      activo.serial || "",
      activo.nombre_equipo || "",
      activo.procesador || "",
      activo.memoria_ram || "",
      activo.almacenamiento || "",
      activo.sistema_operativo || "",
      activo.direccion_ip || "",
      activo.direccion_mac || "",
      etiquetaEstado(activo.estado),
      activo.dependencias?.nombre || "",
      nombrePersona(activo.personas),
      activo.fecha_compra || "",
      activo.proveedor || "",
      activo.numero_factura || "",
      activo.valor_compra ?? "",
      activo.fecha_fin_garantia || "",
      activo.observaciones || "",
    ]);

    const contenido = [
      encabezados,
      ...filas,
    ]
      .map((fila) =>
        fila.map(escaparCSV).join(","),
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + contenido],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download =
      `SIGAT_CMV_INVENTARIO_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
  }

  function imprimirPDF() {
    const filas = filtrados
      .map((activo) => `
        <tr>
          <td>${activo.codigo || ""}</td>
          <td>${activo.tipos_activo?.nombre || ""}</td>
          <td>${activo.marcas?.nombre || ""}</td>
          <td>${activo.modelo || ""}</td>
          <td>${activo.serial || ""}</td>
          <td>${etiquetaEstado(activo.estado)}</td>
          <td>${activo.dependencias?.nombre || ""}</td>
          <td>${nombrePersona(activo.personas)}</td>
        </tr>
      `)
      .join("");

    const ventana = window.open("", "_blank");

    ventana.document.write(`
      <html>
      <head>
        <title>Reporte SIGAT CMV</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          h1 { font-size: 20px; }
          table { width:100%; border-collapse:collapse; }
          th,td { border:1px solid #ccc; padding:6px; font-size:12px; }
          th { background:#f1f5f9; }
        </style>
      </head>
      <body>
        <h1>SIGAT CMV - Reporte de Activos Tecnológicos</h1>
        <p>Fecha: ${new Date().toLocaleDateString("es-CO")}</p>
        <table>
          <thead>
            <tr>
              <th>Placa</th><th>Tipo</th><th>Marca</th>
              <th>Modelo</th><th>Serial</th><th>Estado</th>
              <th>Dependencia</th><th>Responsable</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7 print:hidden">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Consultas
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Reportes
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Consulta, filtra y exporta el inventario tecnológico.
        </p>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="print:hidden">
          <div className="grid gap-3 lg:grid-cols-4">
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
                placeholder="Placa, serial, persona..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={tipo}
              onChange={(event) =>
                setTipo(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                Todos los tipos
              </option>

              {tipos.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nombre}
                </option>
              ))}
            </select>

            <select
              value={estado}
              onChange={(event) =>
                setEstado(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                Todos los estados
              </option>

              {ESTADOS.map(([key, label]) => (
                <option
                  key={key}
                  value={key}
                >
                  {label}
                </option>
              ))}
            </select>

            <select
              value={dependencia}
              onChange={(event) =>
                setDependencia(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                Todas las dependencias
              </option>

              {dependencias.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportarCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={
                cargando ||
                filtrados.length === 0
              }
            >
              <Download size={17} />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={imprimirPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Printer size={17} />
              Imprimir
            </button>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <XCircle size={17} />
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          <Resumen
            titulo="Resultados"
            valor={resumen.total}
          />

          <Resumen
            titulo="Asignados"
            valor={resumen.asignados}
          />

          <Resumen
            titulo="Disponibles"
            valor={resumen.disponibles}
          />

          <Resumen
            titulo="En mantenimiento"
            valor={resumen.mantenimiento}
          />
        </div>

        <div className="mt-6 hidden print:block">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} />

            <div>
              <h2 className="text-xl font-bold">
                SIGAT CMV — Reporte de inventario
              </h2>

              <p className="text-sm">
                Generado:{" "}
                {new Date().toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Placa",
                  "Tipo",
                  "Marca / Modelo",
                  "Serial",
                  "Dependencia",
                  "Responsable",
                  "Estado",
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
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Cargando inventario...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No hay activos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((activo) => (
                  <tr key={activo.id}>
                    <td className="px-4 py-3 font-semibold text-blue-700">
                      {activo.codigo}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {activo.tipos_activo?.nombre ||
                        "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <p>
                        {activo.marcas?.nombre ||
                          "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {activo.modelo ||
                          "Sin modelo"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {activo.serial || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {activo.dependencias?.nombre ||
                        "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {nombrePersona(
                        activo.personas,
                      ) || "Sin asignar"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {etiquetaEstado(
                        activo.estado,
                      )}
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

function Resumen({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {valor}
      </p>
    </div>
  );
}
