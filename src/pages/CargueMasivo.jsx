import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  Upload,
  WandSparkles,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const HOJA_ORIGEN = "2026";
const HOJA_CARGUE = "Cargue Activos";

const COLUMNAS_CARGUE = [
  "Placa de inventario *",
  "Tipo de activo *",
  "Marca",
  "Modelo",
  "Serial",
  "Nombre del equipo",
  "Procesador",
  "Memoria RAM",
  "Almacenamiento principal",
  "Monitor",
  "Tarjeta gráfica",
  "Otros componentes / periféricos",
  "Sistema operativo",
  "Licencia del sistema operativo",
  "Suite de oficina",
  "Antivirus",
  "Fecha inicio licencia antivirus",
  "Otro software institucional clave",
  "Fecha último mantenimiento",
  "Dirección IP",
  "Dirección MAC",
  "Fecha de compra",
  "Proveedor",
  "Número de factura",
  "Valor de compra",
  "Fecha fin de garantía",
  "Estado *",
  "Dependencia",
  "Identificación responsable",
  "Nombres responsable",
  "Apellidos responsable",
  "Cargo responsable",
  "Teléfono responsable",
  "Observaciones",
  "Estado de revisión",
  "Observación SIGAT",
  "Usuario encargado original",
  "SECTOR original",
];

const ESTADOS = new Set([
  "DISPONIBLE",
  "ASIGNADO",
  "EN_MANTENIMIENTO",
  "EN_GARANTIA",
  "EN_PRESTAMO",
  "PENDIENTE_BAJA",
  "DADO_DE_BAJA",
  "PERDIDO",
  "HURTADO",
]);

const TIPOS = {
  IMPRESORA: "Impresora",
  PORTATIL: "Portátil",
  "PC MESA": "Computador de escritorio",
  "PC TODO EN UNO": "Computador todo en uno",
  "TODO EN UNO": "Computador todo en uno",
  ESCANER: "Escáner",
  UPS: "UPS",
  UPC: "UPS",
  MONITOR: "Monitor",
  TV: "Televisor",
  IPAD: "Tablet",
  TABLET: "Tablet",
  CAMARA: "Cámara",
  GABINETE: "Gabinete",
  "DISCO DURO PORTATIL": "Disco duro portátil",
};

function texto(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === 0
  ) {
    return "";
  }

  const salida = String(valor).trim();

  if (
    salida === "#N/A" ||
    salida.toUpperCase() === "N.A." ||
    salida.toUpperCase() === "N.A" ||
    salida.toUpperCase() === "NA"
  ) {
    return "";
  }

  return salida;
}

function limpiarEspacios(valor) {
  return texto(valor)
    .replace(/\s+/g, " ")
    .trim();
}

function clave(valor) {
  return limpiarEspacios(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fechaISO(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    valor === 0
  ) {
    return "";
  }

  if (
    valor instanceof Date &&
    !Number.isNaN(valor.getTime())
  ) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "number") {
    const parsed =
      XLSX.SSF.parse_date_code(valor);

    if (!parsed) return "";

    return `${parsed.y}-${String(
      parsed.m,
    ).padStart(2, "0")}-${String(
      parsed.d,
    ).padStart(2, "0")}`;
  }

  const original = texto(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(original)) {
    return original;
  }

  const partes =
    original.split(/[\/\-\.]/);

  if (partes.length === 3) {
    const [a, b, c] = partes;

    if (
      a.length <= 2 &&
      b.length <= 2 &&
      c.length === 4
    ) {
      return `${c}-${String(b).padStart(
        2,
        "0",
      )}-${String(a).padStart(
        2,
        "0",
      )}`;
    }

    if (a.length === 4) {
      return `${a}-${String(b).padStart(
        2,
        "0",
      )}-${String(c).padStart(
        2,
        "0",
      )}`;
    }
  }

  return "";
}

function restarAnio(fechaIso) {
  if (!fechaIso) return "";

  const [anio, mes, dia] =
    fechaIso.split("-").map(Number);

  const fecha = new Date(
    anio - 1,
    mes - 1,
    dia,
    12,
    0,
    0,
  );

  return [
    fecha.getFullYear(),
    String(
      fecha.getMonth() + 1,
    ).padStart(2, "0"),
    String(fecha.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function separarNombreCompleto(nombreCompleto) {
  const partes = limpiarEspacios(
    nombreCompleto,
  )
    .split(" ")
    .filter(Boolean);

  if (!partes.length) {
    return {
      nombres: "",
      apellidos: "",
    };
  }

  if (partes.length === 1) {
    return {
      nombres: partes[0],
      apellidos: "",
    };
  }

  if (partes.length === 2) {
    return {
      nombres: partes[0],
      apellidos: partes[1],
    };
  }

  if (partes.length === 3) {
    return {
      nombres: partes[0],
      apellidos: partes
        .slice(1)
        .join(" "),
    };
  }

  return {
    nombres: partes
      .slice(0, 2)
      .join(" "),
    apellidos: partes
      .slice(2)
      .join(" "),
  };
}

function normalizarAntivirus(valor) {
  const original =
    limpiarEspacios(valor);

  if (!original) {
    return {
      nombre: "",
      fechaInicio: "",
    };
  }

  const mayus =
    original.toUpperCase();

  if (
    mayus === "NO" ||
    mayus === "NO APLICA" ||
    mayus === "N/A"
  ) {
    return {
      nombre: "",
      fechaInicio: "",
    };
  }

  const match = original.match(
    /vence\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
  );

  if (!match) {
    return {
      nombre: original,
      fechaInicio: "",
    };
  }

  const vencimiento = `${match[3]}-${String(
    match[2],
  ).padStart(2, "0")}-${String(
    match[1],
  ).padStart(2, "0")}`;

  const nombre = original
    .replace(
      /[-–]?\s*vence\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i,
      "",
    )
    .trim();

  return {
    nombre: nombre || original,
    fechaInicio:
      restarAnio(vencimiento),
  };
}

function inferirEstado(
  observacion,
  responsable,
) {
  const obs =
    texto(observacion).toUpperCase();

  if (
    obs.includes("SE DIO BAJA") ||
    obs.includes("DADO DE BAJA") ||
    obs.includes("DIO BAJA")
  ) {
    return "DADO_DE_BAJA";
  }

  if (
    obs.includes("DARLE BAJA") ||
    obs.includes("PENDIENTE BAJA")
  ) {
    return "PENDIENTE_BAJA";
  }

  if (
    obs.includes("HURTO") ||
    obs.includes("HURTAD")
  ) {
    return "HURTADO";
  }

  if (obs.includes("PERDID")) {
    return "PERDIDO";
  }

  return responsable
    ? "ASIGNADO"
    : "DISPONIBLE";
}

function nombreCompletoPersona(persona) {
  return [
    persona.nombres,
    persona.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function pareceNombreDePersona(
  sector,
  responsableOriginal,
  personasPorNombre,
) {
  const s = clave(sector);

  if (!s) return false;

  if (personasPorNombre.has(s)) {
    return true;
  }

  const responsable =
    clave(responsableOriginal);

  if (!responsable) return false;

  if (
    responsable === s ||
    responsable.startsWith(`${s} `) ||
    responsable.endsWith(` ${s}`)
  ) {
    return true;
  }

  const tokensSector = s
    .split(" ")
    .filter(
      (token) => token.length >= 4,
    );

  const tokensResponsable =
    new Set(
      responsable
        .split(" ")
        .filter(Boolean),
    );

  if (
    tokensSector.length &&
    tokensSector.every((token) =>
      tokensResponsable.has(token),
    )
  ) {
    return true;
  }

  return false;
}

function agregarRevision(
  revisiones,
  tipo,
  mensaje,
) {
  revisiones.push({
    tipo,
    mensaje,
  });
}

function estadoRevision(revisiones) {
  if (
    revisiones.some(
      (item) => item.tipo === "ERROR",
    )
  ) {
    return "ERROR";
  }

  if (
    revisiones.some(
      (item) =>
        item.tipo === "REVISAR",
    )
  ) {
    return "REVISAR";
  }

  return "OK";
}

function comentariosRevision(revisiones) {
  return revisiones
    .map((item) => item.mensaje)
    .join(" | ");
}

function construirObservacionesOriginales(
  fila,
) {
  const partes = [];

  const usuarioRed =
    texto(fila["Usuario de red"]);

  const observacion =
    texto(fila["OBSERVACION"]) ||
    texto(fila[","]);

  const hojaVida =
    texto(fila["Hoja de Vida"]);

  if (usuarioRed) {
    partes.push(
      `Usuario de red anterior: ${usuarioRed}`,
    );
  }

  if (observacion) {
    partes.push(observacion);
  }

  if (hojaVida) {
    partes.push(
      `Hoja de vida anterior: ${hojaVida}`,
    );
  }

  return partes.join(" | ");
}

function prefijoBase(nombre) {
  const palabras =
    limpiarEspacios(nombre)
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-zA-Z0-9 ]/g,
        " ",
      )
      .split(/\s+/)
      .filter(Boolean);

  if (!palabras.length) {
    return "ACT";
  }

  if (palabras.length === 1) {
    return palabras[0]
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
  }

  return palabras
    .slice(0, 3)
    .map((item) => item[0])
    .join("")
    .toUpperCase()
    .padEnd(3, "X");
}

function construirPrefijo(
  nombre,
  usados,
) {
  const base =
    prefijoBase(nombre);

  if (!usados.has(base)) {
    usados.add(base);
    return base;
  }

  for (let i = 1; i <= 99; i += 1) {
    const candidato =
      `${base.slice(0, 2)}${i}`.slice(
        0,
        4,
      );

    if (!usados.has(candidato)) {
      usados.add(candidato);
      return candidato;
    }
  }

  const fallback = `A${Date.now()
    .toString()
    .slice(-3)}`;

  usados.add(fallback);

  return fallback;
}

function descargarWorkbook(
  workbook,
  nombre,
) {
  XLSX.writeFile(workbook, nombre, {
    compression: true,
  });
}

function crearHojaInstrucciones() {
  const filas = [
    [
      "ARCHIVO PREPARADO PARA CARGUE MASIVO - SIGAT CMV",
    ],
    [""],
    [
      "Este archivo fue generado automáticamente a partir del inventario anterior.",
    ],
    [
      "Corrige únicamente las filas marcadas como REVISAR o ERROR.",
    ],
    [""],
    ["Estado de revisión", "Significado"],
    [
      "OK",
      "SIGAT pudo interpretar la información con suficiente seguridad.",
    ],
    [
      "REVISAR",
      "SIGAT organizó la fila, pero existe un dato que conviene confirmar.",
    ],
    [
      "ERROR",
      "Falta un dato indispensable o existe un conflicto que debe corregirse antes del cargue.",
    ],
    [""],
    [
      "No cambies los nombres de las columnas de la hoja Cargue Activos.",
    ],
    [
      "Para filas con REVISAR, corrige la información y puedes cambiar Estado de revisión a OK.",
    ],
    [
      "Los campos adicionales al final son informativos y no se cargan a la base.",
    ],
  ];

  return XLSX.utils.aoa_to_sheet(
    filas,
  );
}

export default function CargueMasivo() {
  const { perfil } = useAuth();

  const inputPrepararRef =
    useRef(null);

  const inputCargarRef =
    useRef(null);

  const puedeGestionar =
    perfil?.rol === "ADMIN" ||
    perfil?.rol === "TECNICO";

  const [
    preparando,
    setPreparando,
  ] = useState(false);

  const [
    preparado,
    setPreparado,
  ] = useState(null);

  const [
    erroresPreparacion,
    setErroresPreparacion,
  ] = useState([]);

  const [
    archivoCarga,
    setArchivoCarga,
  ] = useState(null);

  const [
    filasCarga,
    setFilasCarga,
  ] = useState([]);

  const [
    cargandoArchivo,
    setCargandoArchivo,
  ] = useState(false);

  const [
    cargandoBase,
    setCargandoBase,
  ] = useState(false);

  const [
    erroresCarga,
    setErroresCarga,
  ] = useState([]);

  const [
    resultadoCarga,
    setResultadoCarga,
  ] = useState(null);

  const resumenCarga = useMemo(
    () => {
      return {
        total: filasCarga.length,
        error: filasCarga.filter(
          (fila) =>
            fila.estadoRevision ===
            "ERROR",
        ).length,
        revisar: filasCarga.filter(
          (fila) =>
            fila.estadoRevision ===
            "REVISAR",
        ).length,
        ok: filasCarga.filter(
          (fila) =>
            fila.estadoRevision ===
            "OK",
        ).length,
      };
    },
    [filasCarga],
  );

  async function prepararExcel(
    event,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setPreparando(true);
    setPreparado(null);
    setErroresPreparacion([]);

    try {
      const [
        dependenciasRes,
        personasRes,
      ] = await Promise.all([
        supabase
          .from("dependencias")
          .select(
            "id,nombre,activo",
          ),
        supabase
          .from("personas")
          .select(`
            id,
            identificacion,
            nombres,
            apellidos,
            cargo,
            telefono,
            dependencia_id,
            activo,
            dependencias(nombre)
          `),
      ]);

      if (dependenciasRes.error) {
        throw dependenciasRes.error;
      }

      if (personasRes.error) {
        throw personasRes.error;
      }

      const dependencias =
        dependenciasRes.data || [];

      const personas =
        personasRes.data || [];

      const dependenciaPorNombre =
        new Map(
          dependencias.map(
            (item) => [
              clave(item.nombre),
              item,
            ],
          ),
        );

      const personasPorNombre =
        new Map();

      personas.forEach(
        (persona) => {
          const completo =
            nombreCompletoPersona(
              persona,
            );

          if (completo) {
            personasPorNombre.set(
              clave(completo),
              persona,
            );
          }
        },
      );

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });

      const worksheet =
        workbook.Sheets[
          HOJA_ORIGEN
        ];

      if (!worksheet) {
        throw new Error(
          `No se encontró la hoja "${HOJA_ORIGEN}" en el archivo.`,
        );
      }

      const datos =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
            raw: true,
          },
        );

      const filasOrigen =
        datos.filter((fila) => {
          return (
            texto(fila["Placa"]) ||
            texto(
              fila["Periferico"],
            ) ||
            texto(
              fila[
                "Usuraio encargado"
              ],
            ) ||
            texto(
              fila[
                "Usuario encargado"
              ],
            )
          );
        });

      if (!filasOrigen.length) {
        throw new Error(
          "No se encontraron registros en la hoja 2026.",
        );
      }

      const placas =
        new Map();

      const seriales =
        new Map();

      filasOrigen.forEach(
        (fila, indice) => {
          const placa =
            texto(fila["Placa"]);

          const serial =
            texto(fila["Serial"]);

          if (placa) {
            const k = clave(placa);

            placas.set(
              k,
              [
                ...(placas.get(k) ||
                  []),
                indice,
              ],
            );
          }

          if (serial) {
            const k =
              clave(serial);

            seriales.set(
              k,
              [
                ...(seriales.get(
                  k,
                ) || []),
                indice,
              ],
            );
          }
        },
      );

      const salida =
        filasOrigen.map(
          (fila, indice) => {
            const revisiones = [];

            const placa =
              texto(fila["Placa"]);

            const periferico =
              limpiarEspacios(
                fila["Periferico"],
              ).toUpperCase();

            const tipo =
              TIPOS[periferico] ||
              limpiarEspacios(
                fila["Periferico"],
              );

            const responsableOriginal =
              limpiarEspacios(
                fila[
                  "Usuario encargado"
                ] ||
                  fila[
                    "Usuraio encargado"
                  ],
              );

            const sectorOriginal =
              limpiarEspacios(
                fila["SECTOR"],
              );

            const serial =
              texto(fila["Serial"]);

            const observacion =
              texto(
                fila[
                  "OBSERVACION"
                ],
              ) ||
              texto(fila[","]);

            if (!placa) {
              agregarRevision(
                revisiones,
                "ERROR",
                "Falta placa de inventario.",
              );
            }

            if (!tipo) {
              agregarRevision(
                revisiones,
                "ERROR",
                "Falta tipo de activo.",
              );
            }

            if (
              placa &&
              (
                placas.get(
                  clave(placa),
                ) || []
              ).length > 1
            ) {
              agregarRevision(
                revisiones,
                "ERROR",
                "La placa está repetida en el archivo original.",
              );
            }

            if (
              serial &&
              (
                seriales.get(
                  clave(serial),
                ) || []
              ).length > 1
            ) {
              agregarRevision(
                revisiones,
                "ERROR",
                "El serial está repetido en el archivo original.",
              );
            }

            let nombres = "";
            let apellidos = "";
            let identificacion = "";
            let cargo = "";
            let telefono = "";
            let dependencia = "";

            const personaExistente =
              responsableOriginal
                ? personasPorNombre.get(
                    clave(
                      responsableOriginal,
                    ),
                  )
                : null;

            if (personaExistente) {
              nombres =
                personaExistente.nombres ||
                "";

              apellidos =
                personaExistente.apellidos ||
                "";

              identificacion =
                personaExistente.identificacion ||
                "";

              cargo =
                personaExistente.cargo ||
                "";

              telefono =
                personaExistente.telefono ||
                "";

              if (
                personaExistente
                  .dependencias?.nombre
              ) {
                dependencia =
                  personaExistente
                    .dependencias
                    .nombre;
              }
            } else if (
              responsableOriginal
            ) {
              const separado =
                separarNombreCompleto(
                  responsableOriginal,
                );

              nombres =
                separado.nombres;

              apellidos =
                separado.apellidos;

              agregarRevision(
                revisiones,
                "REVISAR",
                "El funcionario no existe actualmente en Personas. SIGAT separó nombres y apellidos; confirma la división y completa identificación/cargo/teléfono si los tienes.",
              );
            }

            if (sectorOriginal) {
              const depExistente =
                dependenciaPorNombre.get(
                  clave(
                    sectorOriginal,
                  ),
                );

              if (depExistente) {
                dependencia =
                  depExistente.nombre;
              } else if (
                pareceNombreDePersona(
                  sectorOriginal,
                  responsableOriginal,
                  personasPorNombre,
                )
              ) {
                agregarRevision(
                  revisiones,
                  "REVISAR",
                  `SECTOR="${sectorOriginal}" parece un nombre de funcionario y no una dependencia. Se conservó en SECTOR original, pero no se copió como dependencia.`,
                );
              } else if (
                !dependencia
              ) {
                dependencia =
                  sectorOriginal;

                agregarRevision(
                  revisiones,
                  "REVISAR",
                  `La dependencia "${sectorOriginal}" no existe actualmente en el catálogo. Confirma si debe crearse con ese nombre.`,
                );
              } else if (
                clave(dependencia) !==
                clave(sectorOriginal)
              ) {
                agregarRevision(
                  revisiones,
                  "REVISAR",
                  `El funcionario figura en "${dependencia}", pero el Excel dice SECTOR="${sectorOriginal}". Confirma cuál dependencia es correcta.`,
                );
              }
            } else if (
              responsableOriginal &&
              !dependencia
            ) {
              agregarRevision(
                revisiones,
                "REVISAR",
                "El registro tiene funcionario responsable pero no tiene dependencia.",
              );
            }

            const antivirus =
              normalizarAntivirus(
                fila["Antivirus"],
              );

            const fechaMantenimiento =
              fechaISO(
                fila[
                  "Fecha Mantenimiento o soporte"
                ],
              );

            if (
              texto(
                fila[
                  "Fecha Mantenimiento o soporte"
                ],
              ) &&
              !fechaMantenimiento
            ) {
              agregarRevision(
                revisiones,
                "REVISAR",
                "La fecha de mantenimiento no pudo interpretarse automáticamente.",
              );
            }

            const fechaCompra =
              fechaISO(
                fila[
                  "Fecha de adquisición"
                ],
              );

            if (
              texto(
                fila[
                  "Fecha de adquisición"
                ],
              ) &&
              !fechaCompra
            ) {
              agregarRevision(
                revisiones,
                "REVISAR",
                "La fecha de adquisición no pudo interpretarse automáticamente.",
              );
            }

            const estado =
              inferirEstado(
                observacion,
                responsableOriginal,
              );

            const filaSalida = {
              "Placa de inventario *":
                placa,
              "Tipo de activo *":
                tipo,
              Marca:
                texto(fila["Marca"]),
              Modelo:
                texto(fila["Modelo"]),
              Serial: serial,
              "Nombre del equipo":
                texto(
                  fila[
                    "Nombre del PC"
                  ],
                ),
              Procesador:
                texto(
                  fila["PROCESADOR"],
                ),
              "Memoria RAM":
                texto(fila["RAM"]),
              "Almacenamiento principal":
                texto(
                  fila["Disco Duro"],
                ),
              Monitor: "",
              "Tarjeta gráfica": "",
              "Otros componentes / periféricos":
                "",
              "Sistema operativo":
                texto(
                  fila[
                    "Sistema Operativo"
                  ],
                ),
              "Licencia del sistema operativo":
                "",
              "Suite de oficina":
                texto(
                  fila[
                    "Microsoft Office"
                  ],
                ),
              Antivirus:
                antivirus.nombre,
              "Fecha inicio licencia antivirus":
                antivirus.fechaInicio,
              "Otro software institucional clave":
                "",
              "Fecha último mantenimiento":
                fechaMantenimiento,
              "Dirección IP": "",
              "Dirección MAC": "",
              "Fecha de compra":
                fechaCompra,
              Proveedor: "",
              "Número de factura": "",
              "Valor de compra": "",
              "Fecha fin de garantía":
                "",
              "Estado *": estado,
              Dependencia:
                dependencia,
              "Identificación responsable":
                identificacion,
              "Nombres responsable":
                nombres,
              "Apellidos responsable":
                apellidos,
              "Cargo responsable":
                cargo,
              "Teléfono responsable":
                telefono,
              Observaciones:
                construirObservacionesOriginales(
                  fila,
                ),
              "Estado de revisión":
                estadoRevision(
                  revisiones,
                ),
              "Observación SIGAT":
                comentariosRevision(
                  revisiones,
                ),
              "Usuario encargado original":
                responsableOriginal,
              "SECTOR original":
                sectorOriginal,
            };

            return filaSalida;
          },
        );

      const wsSalida =
        XLSX.utils.json_to_sheet(
          salida,
          {
            header:
              COLUMNAS_CARGUE,
          },
        );

      wsSalida["!autofilter"] = {
        ref: `A1:AL${
          salida.length + 1
        }`,
      };

      wsSalida["!cols"] =
        COLUMNAS_CARGUE.map(
          (columna) => {
            if (
              columna ===
                "Observación SIGAT" ||
              columna ===
                "Observaciones"
            ) {
              return { wch: 45 };
            }

            if (
              columna ===
                "Tipo de activo *" ||
              columna ===
                "Dependencia" ||
              columna.includes(
                "responsable",
              )
            ) {
              return { wch: 25 };
            }

            return { wch: 18 };
          },
        );

      const workbookSalida =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbookSalida,
        wsSalida,
        HOJA_CARGUE,
      );

      XLSX.utils.book_append_sheet(
        workbookSalida,
        crearHojaInstrucciones(),
        "Instrucciones",
      );

      const totales = {
        total: salida.length,
        ok: salida.filter(
          (fila) =>
            fila[
              "Estado de revisión"
            ] === "OK",
        ).length,
        revisar: salida.filter(
          (fila) =>
            fila[
              "Estado de revisión"
            ] === "REVISAR",
        ).length,
        error: salida.filter(
          (fila) =>
            fila[
              "Estado de revisión"
            ] === "ERROR",
        ).length,
      };

      setPreparado({
        workbook:
          workbookSalida,
        nombre:
          "SIGAT_INVENTARIO_ORGANIZADO.xlsx",
        ...totales,
      });
    } catch (error) {
      setErroresPreparacion([
        error?.message ||
          "No se pudo preparar el archivo.",
      ]);
    } finally {
      setPreparando(false);

      if (
        inputPrepararRef.current
      ) {
        inputPrepararRef.current.value =
          "";
      }
    }
  }

  function descargarPreparado() {
    if (!preparado) return;

    descargarWorkbook(
      preparado.workbook,
      preparado.nombre,
    );
  }

  async function leerArchivoOrganizado(
    event,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setArchivoCarga(file);
    setFilasCarga([]);
    setErroresCarga([]);
    setResultadoCarga(null);
    setCargandoArchivo(true);

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });

      const worksheet =
        workbook.Sheets[
          HOJA_CARGUE
        ];

      if (!worksheet) {
        throw new Error(
          `No se encontró la hoja "${HOJA_CARGUE}".`,
        );
      }

      const datos =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
            raw: true,
          },
        );

      const placas = new Set();
      const seriales = new Set();

      const filas = datos
        .filter(
          (fila) =>
            texto(
              fila[
                "Placa de inventario *"
              ],
            ) ||
            texto(
              fila[
                "Tipo de activo *"
              ],
            ),
        )
        .map((fila, index) => {
          const errores = [];

          const placa =
            texto(
              fila[
                "Placa de inventario *"
              ],
            );

          const tipo =
            limpiarEspacios(
              fila[
                "Tipo de activo *"
              ],
            );

          const serial =
            texto(fila.Serial);

          const estado =
            texto(
              fila["Estado *"],
            ).toUpperCase() ||
            "DISPONIBLE";

          if (!placa) {
            errores.push(
              "Falta placa.",
            );
          }

          if (!tipo) {
            errores.push(
              "Falta tipo de activo.",
            );
          }

          if (
            !ESTADOS.has(estado)
          ) {
            errores.push(
              `Estado inválido: ${estado}.`,
            );
          }

          if (placa) {
            const k = clave(placa);

            if (placas.has(k)) {
              errores.push(
                "Placa repetida dentro del archivo.",
              );
            }

            placas.add(k);
          }

          if (serial) {
            const k = clave(serial);

            if (
              seriales.has(k)
            ) {
              errores.push(
                "Serial repetido dentro del archivo.",
              );
            }

            seriales.add(k);
          }

          const estadoDelExcel =
            texto(
              fila[
                "Estado de revisión"
              ],
            ).toUpperCase();

          if (
            estadoDelExcel ===
            "ERROR"
          ) {
            errores.push(
              "La fila continúa marcada como ERROR en la revisión.",
            );
          }

          return {
            numeroFila:
              index + 2,
            datos: fila,
            placa,
            tipo,
            serial,
            estado,
            estadoRevision:
              errores.length
                ? "ERROR"
                : estadoDelExcel ===
                    "REVISAR"
                  ? "REVISAR"
                  : "OK",
            errores,
          };
        });

      setFilasCarga(filas);
    } catch (error) {
      setErroresCarga([
        error?.message ||
          "No se pudo leer el archivo organizado.",
      ]);
    } finally {
      setCargandoArchivo(false);
    }
  }

  async function cargarOrganizado() {
    if (!filasCarga.length) {
      return;
    }

    const conErrores =
      filasCarga.filter(
        (fila) =>
          fila.estadoRevision ===
          "ERROR",
      );

    if (conErrores.length) {
      setErroresCarga([
        `Hay ${conErrores.length} fila(s) con ERROR. Corrígelas antes de cargar.`,
      ]);
      return;
    }

    setCargandoBase(true);
    setErroresCarga([]);
    setResultadoCarga(null);

    try {
      const [
        tiposRes,
        marcasRes,
        dependenciasRes,
        personasRes,
        activosRes,
      ] = await Promise.all([
        supabase
          .from("tipos_activo")
          .select(
            "id,nombre,prefijo",
          ),
        supabase
          .from("marcas")
          .select("id,nombre"),
        supabase
          .from("dependencias")
          .select("id,nombre"),
        supabase
          .from("personas")
          .select(`
            id,
            identificacion,
            nombres,
            apellidos,
            cargo,
            telefono,
            dependencia_id
          `),
        supabase
          .from("activos")
          .select(
            "id,codigo,serial",
          ),
      ]);

      const errorInicial = [
        tiposRes.error,
        marcasRes.error,
        dependenciasRes.error,
        personasRes.error,
        activosRes.error,
      ].find(Boolean);

      if (errorInicial) {
        throw errorInicial;
      }

      const tipos = new Map(
        (tiposRes.data || []).map(
          (item) => [
            clave(item.nombre),
            item,
          ],
        ),
      );

      const marcas = new Map(
        (marcasRes.data || []).map(
          (item) => [
            clave(item.nombre),
            item,
          ],
        ),
      );

      const dependencias =
        new Map(
          (
            dependenciasRes.data ||
            []
          ).map((item) => [
            clave(item.nombre),
            item,
          ]),
        );

      const personasPorId =
        new Map();

      const personasPorNombre =
        new Map();

      (
        personasRes.data || []
      ).forEach((persona) => {
        if (
          persona.identificacion
        ) {
          personasPorId.set(
            texto(
              persona.identificacion,
            ),
            persona,
          );
        }

        const completo =
          nombreCompletoPersona(
            persona,
          );

        if (completo) {
          personasPorNombre.set(
            clave(completo),
            persona,
          );
        }
      });

      const placasBD =
        new Set(
          (activosRes.data || []).map(
            (item) =>
              clave(item.codigo),
          ),
        );

      const serialesBD =
        new Set(
          (activosRes.data || [])
            .filter(
              (item) =>
                item.serial,
            )
            .map((item) =>
              clave(item.serial),
            ),
        );

      const conflictos = [];

      filasCarga.forEach(
        (fila) => {
          if (
            placasBD.has(
              clave(fila.placa),
            )
          ) {
            conflictos.push(
              `Fila ${fila.numeroFila}: la placa ${fila.placa} ya existe en SIGAT.`,
            );
          }

          if (
            fila.serial &&
            serialesBD.has(
              clave(fila.serial),
            )
          ) {
            conflictos.push(
              `Fila ${fila.numeroFila}: el serial ${fila.serial} ya existe en SIGAT.`,
            );
          }
        },
      );

      if (conflictos.length) {
        setErroresCarga(
          conflictos.slice(
            0,
            40,
          ),
        );
        return;
      }

      const prefijosUsados =
        new Set(
          (tiposRes.data || [])
            .map((item) =>
              texto(
                item.prefijo,
              ).toUpperCase(),
            )
            .filter(Boolean),
        );

      for (const fila of filasCarga) {
        const nombre =
          fila.tipo;

        const k = clave(nombre);

        if (!tipos.has(k)) {
          const { data, error } =
            await supabase
              .from("tipos_activo")
              .insert({
                nombre,
                prefijo:
                  construirPrefijo(
                    nombre,
                    prefijosUsados,
                  ),
                activo: true,
              })
              .select(
                "id,nombre,prefijo",
              )
              .single();

          if (error) throw error;

          tipos.set(k, data);
        }
      }

      for (const fila of filasCarga) {
        const nombre =
          limpiarEspacios(
            fila.datos.Marca,
          );

        if (!nombre) continue;

        const k = clave(nombre);

        if (!marcas.has(k)) {
          const { data, error } =
            await supabase
              .from("marcas")
              .insert({
                nombre,
                activo: true,
              })
              .select("id,nombre")
              .single();

          if (error) throw error;

          marcas.set(k, data);
        }
      }

      for (const fila of filasCarga) {
        const nombre =
          limpiarEspacios(
            fila.datos.Dependencia,
          );

        if (!nombre) continue;

        const k = clave(nombre);

        if (
          !dependencias.has(k)
        ) {
          const { data, error } =
            await supabase
              .from(
                "dependencias",
              )
              .insert({
                nombre,
                activo: true,
              })
              .select("id,nombre")
              .single();

          if (error) throw error;

          dependencias.set(
            k,
            data,
          );
        }
      }

      const payloads = [];

      for (const fila of filasCarga) {
        const d = fila.datos;

        const dependenciaNombre =
          limpiarEspacios(
            d.Dependencia,
          );

        const dependencia =
          dependenciaNombre
            ? dependencias.get(
                clave(
                  dependenciaNombre,
                ),
              )
            : null;

        const identificacion =
          texto(
            d[
              "Identificación responsable"
            ],
          );

        const nombres =
          limpiarEspacios(
            d[
              "Nombres responsable"
            ],
          );

        const apellidos =
          limpiarEspacios(
            d[
              "Apellidos responsable"
            ],
          );

        const completo = [
          nombres,
          apellidos,
        ]
          .filter(Boolean)
          .join(" ");

        let responsable =
          identificacion
            ? personasPorId.get(
                identificacion,
              )
            : null;

        if (
          !responsable &&
          completo
        ) {
          responsable =
            personasPorNombre.get(
              clave(completo),
            ) || null;
        }

        if (
          !responsable &&
          nombres
        ) {
          const {
            data,
            error,
          } = await supabase
            .from("personas")
            .insert({
              identificacion:
                identificacion ||
                null,
              nombres,
              apellidos:
                apellidos || null,
              cargo:
                limpiarEspacios(
                  d[
                    "Cargo responsable"
                  ],
                ) || null,
              telefono:
                texto(
                  d[
                    "Teléfono responsable"
                  ],
                ) || null,
              dependencia_id:
                dependencia?.id ||
                null,
              activo: true,
            })
            .select(`
              id,
              identificacion,
              nombres,
              apellidos,
              dependencia_id
            `)
            .single();

          if (error) throw error;

          responsable = data;

          if (
            data.identificacion
          ) {
            personasPorId.set(
              texto(
                data.identificacion,
              ),
              data,
            );
          }

          personasPorNombre.set(
            clave(
              nombreCompletoPersona(
                data,
              ),
            ),
            data,
          );
        }

        const tipo =
          tipos.get(
            clave(
              d[
                "Tipo de activo *"
              ],
            ),
          );

        const marcaNombre =
          limpiarEspacios(
            d.Marca,
          );

        const marca =
          marcaNombre
            ? marcas.get(
                clave(marcaNombre),
              )
            : null;

        payloads.push({
          codigo: texto(
            d[
              "Placa de inventario *"
            ],
          ),
          tipo_activo_id:
            tipo?.id,
          marca_id:
            marca?.id || null,
          modelo:
            texto(d.Modelo) ||
            null,
          serial:
            texto(d.Serial) ||
            null,
          nombre_equipo:
            texto(
              d[
                "Nombre del equipo"
              ],
            ) || null,
          procesador:
            texto(
              d.Procesador,
            ) || null,
          memoria_ram:
            texto(
              d["Memoria RAM"],
            ) || null,
          almacenamiento:
            texto(
              d[
                "Almacenamiento principal"
              ],
            ) || null,
          monitor:
            texto(d.Monitor) ||
            null,
          tarjeta_grafica:
            texto(
              d[
                "Tarjeta gráfica"
              ],
            ) || null,
          otros_componentes:
            texto(
              d[
                "Otros componentes / periféricos"
              ],
            ) || null,
          sistema_operativo:
            texto(
              d[
                "Sistema operativo"
              ],
            ) || null,
          licencia_sistema_operativo:
            texto(
              d[
                "Licencia del sistema operativo"
              ],
            ) || null,
          suite_oficina:
            texto(
              d[
                "Suite de oficina"
              ],
            ) || null,
          antivirus:
            texto(
              d.Antivirus,
            ) || null,
          fecha_inicio_licencia_antivirus:
            fechaISO(
              d[
                "Fecha inicio licencia antivirus"
              ],
            ) || null,
          otro_software:
            texto(
              d[
                "Otro software institucional clave"
              ],
            ) || null,
          fecha_ultimo_mantenimiento:
            fechaISO(
              d[
                "Fecha último mantenimiento"
              ],
            ) || null,
          direccion_ip:
            texto(
              d[
                "Dirección IP"
              ],
            ) || null,
          direccion_mac:
            texto(
              d[
                "Dirección MAC"
              ],
            ) || null,
          fecha_compra:
            fechaISO(
              d[
                "Fecha de compra"
              ],
            ) || null,
          proveedor:
            texto(
              d.Proveedor,
            ) || null,
          numero_factura:
            texto(
              d[
                "Número de factura"
              ],
            ) || null,
          valor_compra:
            d[
              "Valor de compra"
            ] === "" ||
            d[
              "Valor de compra"
            ] === null ||
            d[
              "Valor de compra"
            ] === undefined
              ? null
              : Number(
                  d[
                    "Valor de compra"
                  ],
                ) || null,
          fecha_fin_garantia:
            fechaISO(
              d[
                "Fecha fin de garantía"
              ],
            ) || null,
          estado:
            fila.estado,
          dependencia_id:
            dependencia?.id ||
            responsable
              ?.dependencia_id ||
            null,
          responsable_id:
            responsable?.id ||
            null,
          observaciones:
            texto(
              d.Observaciones,
            ) || null,
        });
      }

      let insertados = 0;
      const TAMANO = 100;

      for (
        let i = 0;
        i < payloads.length;
        i += TAMANO
      ) {
        const bloque =
          payloads.slice(
            i,
            i + TAMANO,
          );

        const { data, error } =
          await supabase
            .from("activos")
            .insert(bloque)
            .select("id");

        if (error) throw error;

        insertados +=
          data?.length ||
          bloque.length;
      }

      setResultadoCarga({
        insertados,
        revisar:
          resumenCarga.revisar,
      });

      setFilasCarga([]);
      setArchivoCarga(null);

      if (
        inputCargarRef.current
      ) {
        inputCargarRef.current.value =
          "";
      }
    } catch (error) {
      setErroresCarga([
        error?.message ||
          "No se pudo completar el cargue.",
      ]);
    } finally {
      setCargandoBase(false);
    }
  }

  if (!puedeGestionar) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="font-bold text-amber-900">
          Acceso restringido
        </h1>

        <p className="mt-2 text-sm text-amber-800">
          Esta herramienta solo está disponible para ADMIN y TECNICO.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Inventario
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Cargue masivo
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          Primero convierte y depura tu Excel anterior. Después revisa únicamente
          las inconsistencias señaladas y carga el archivo organizado a SIGAT.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white p-3 text-violet-700 shadow-sm">
              <WandSparkles size={24} />
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Paso 1
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Preparar mi Excel actual
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sube tu archivo antiguo tal como está. SIGAT organizará la hoja
                2026, separará funcionarios, propondrá dependencias y marcará
                únicamente los datos dudosos.
              </p>

              <input
                ref={inputPrepararRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={prepararExcel}
                className="hidden"
              />

              <button
                type="button"
                disabled={preparando}
                onClick={() =>
                  inputPrepararRef.current?.click()
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {preparando ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Upload size={18} />
                )}

                {preparando
                  ? "Organizando..."
                  : "Seleccionar Excel actual"}
              </button>
            </div>
          </div>

          {erroresPreparacion.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              {erroresPreparacion.map(
                (error, index) => (
                  <p
                    key={`${error}-${index}`}
                    className="text-sm text-red-700"
                  >
                    {error}
                  </p>
                ),
              )}
            </div>
          )}

          {preparado && (
            <div className="mt-5 rounded-xl border border-violet-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <FileCheck2
                  size={19}
                  className="text-violet-700"
                />

                <p className="font-semibold text-slate-900">
                  Archivo organizado
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Dato
                  label="Total"
                  value={preparado.total}
                />
                <Dato
                  label="OK"
                  value={preparado.ok}
                />
                <Dato
                  label="Revisar"
                  value={preparado.revisar}
                />
                <Dato
                  label="Errores"
                  value={preparado.error}
                />
              </div>

              <button
                type="button"
                onClick={descargarPreparado}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Download size={18} />
                Descargar Excel organizado
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white p-3 text-emerald-700 shadow-sm">
              <FileSpreadsheet size={24} />
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Paso 2
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Cargar archivo organizado
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Después de revisar el Excel generado, súbelo aquí. SIGAT hará una
                segunda validación antes de escribir en la base de datos.
              </p>

              <input
                ref={inputCargarRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={leerArchivoOrganizado}
                className="hidden"
              />

              <button
                type="button"
                disabled={cargandoArchivo}
                onClick={() =>
                  inputCargarRef.current?.click()
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {cargandoArchivo ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Upload size={18} />
                )}

                Seleccionar Excel organizado
              </button>

              {archivoCarga && (
                <p className="mt-3 text-xs font-medium text-emerald-800">
                  {archivoCarga.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {erroresCarga.length > 0 && (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle size={20} />
            <h3 className="font-bold">
              Revisa antes de cargar
            </h3>
          </div>

          <ul className="mt-3 max-h-64 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-red-700">
            {erroresCarga.map(
              (error, index) => (
                <li
                  key={`${error}-${index}`}
                >
                  {error}
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {resultadoCarga && (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 size={20} />

            <h3 className="font-bold">
              Cargue terminado correctamente
            </h3>
          </div>

          <p className="mt-2 text-sm text-emerald-700">
            Se cargaron{" "}
            <strong>
              {resultadoCarga.insertados}
            </strong>{" "}
            activos.
          </p>
        </section>
      )}

      {filasCarga.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Validación final
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total: {resumenCarga.total} · OK:{" "}
                {resumenCarga.ok} · Revisar:{" "}
                {resumenCarga.revisar} · Error:{" "}
                {resumenCarga.error}
              </p>

              {resumenCarga.revisar > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Las filas marcadas REVISAR no bloquean el cargue si ya confirmaste
                  que su información es correcta. Las filas ERROR sí deben corregirse.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={
                cargandoBase ||
                resumenCarga.error > 0
              }
              onClick={cargarOrganizado}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargandoBase ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Upload size={18} />
              )}

              {cargandoBase
                ? "Cargando..."
                : `Cargar ${filasCarga.length} activos`}
            </button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fila",
                    "Revisión",
                    "Placa",
                    "Tipo",
                    "Responsable",
                    "Dependencia",
                    "Observación",
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

              <tbody className="divide-y divide-slate-100">
                {filasCarga
                  .slice(0, 200)
                  .map((fila) => {
                    const d = fila.datos;

                    return (
                      <tr
                        key={`${fila.numeroFila}-${fila.placa}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {fila.numeroFila}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            estado={fila.estadoRevision}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                          {fila.placa || "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          {fila.tipo || "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {[
                            d["Nombres responsable"],
                            d["Apellidos responsable"],
                          ]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {d.Dependencia || "—"}
                        </td>

                        <td className="max-w-md px-4 py-3 text-xs text-slate-500">
                          {fila.errores.length
                            ? fila.errores.join(" ")
                            : d["Observación SIGAT"] ||
                              "Lista para cargar."}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Badge({ estado }) {
  if (estado === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <XCircle size={14} />
        Error
      </span>
    );
  }

  if (estado === "REVISAR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <AlertTriangle size={14} />
        Revisar
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={14} />
      OK
    </span>
  );
}
