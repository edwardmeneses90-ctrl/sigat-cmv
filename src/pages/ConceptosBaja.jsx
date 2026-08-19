import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ConceptoBajaImprimible from "../components/conceptos/ConceptoBajaImprimible";

const FORM_INICIAL = {
  activo_id: "",
  fecha: new Date().toISOString().slice(0, 10),

  destinatario_nombre: "GERALDINE ROJAS",
  destinatario_oficina: "Oficina de Recursos Físicos",
  destinatario_entidad: "Concejo Municipal de Villavicencio",
  referencia: "Concepto Técnico De Evaluación Y Diagnóstico De Equipo De Cómputo",

  antecedentes_descripcion_falla: "",
  inspeccion_mantenimiento_correctivo: "",
  diagnostico_conclusiones: "",
  recomendacion_concepto: "",
  nota_seguridad_informacion: "",

  tecnico_id: "",
  tecnico_area: "Comunicaciones y Prensa",
};

function nombrePersona(persona) {
  if (!persona) return "";

  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export default function ConceptosBaja() {
  const { perfil } = useAuth();

  const puedeGestionar =
    perfil?.rol === "ADMIN" ||
    perfil?.rol === "TECNICO";

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [conceptos, setConceptos] = useState([]);
  const [activos, setActivos] = useState([]);
  const [personas, setPersonas] = useState([]);

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const [busqueda, setBusqueda] = useState("");
  const [conceptoImprimir, setConceptoImprimir] = useState(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    setError("");

    const [conceptosRes, activosRes, personasRes] = await Promise.all([
      supabase
        .from("conceptos_baja")
        .select("*")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("activos")
        .select(`
          id,
          codigo,
          modelo,
          serial,
          estado,
          tipo:tipos_activo(nombre),
          marca:marcas(nombre),
          dependencia:dependencias(nombre),
          responsable:personas(
            id,
            nombres,
            apellidos,
            cargo
          )
        `)
        .order("codigo"),

      supabase
        .from("personas")
        .select(`
          id,
          nombres,
          apellidos,
          cargo,
          telefono,
          correo,
          activo,
          dependencias(nombre)
        `)
        .eq("activo", true)
        .order("nombres"),
    ]);

    const firstError = [
      conceptosRes.error,
      activosRes.error,
      personasRes.error,
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setCargando(false);
      return;
    }

    setConceptos(conceptosRes.data || []);
    setActivos(activosRes.data || []);
    setPersonas(personasRes.data || []);
    setCargando(false);
  }

  const tecnicos = useMemo(() => {
    return personas.filter(
      (persona) =>
        persona.dependencias?.nombre
          ?.trim()
          .toLowerCase() === "sistemas",
    );
  }, [personas]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return conceptos;

    return conceptos.filter((item) =>
      [
        item.placa_inventario,
        item.tipo_equipo,
        item.asignado_a,
        item.dependencia,
        item.marca,
        item.modelo,
        item.numero_serie,
        item.tecnico_nombre,
        item.referencia,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [conceptos, busqueda]);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setError("");
    setMensaje("");
    setModal(true);
  }

  function abrirEditar(item) {
    setEditando(item);

    setForm({
      activo_id: item.activo_id || "",
      fecha: item.fecha || FORM_INICIAL.fecha,
      destinatario_nombre:
        item.destinatario_nombre || FORM_INICIAL.destinatario_nombre,
      destinatario_oficina:
        item.destinatario_oficina || FORM_INICIAL.destinatario_oficina,
      destinatario_entidad:
        item.destinatario_entidad || FORM_INICIAL.destinatario_entidad,
      referencia:
        item.referencia || FORM_INICIAL.referencia,

      antecedentes_descripcion_falla:
        item.antecedentes_descripcion_falla || "",
      inspeccion_mantenimiento_correctivo:
        item.inspeccion_mantenimiento_correctivo || "",
      diagnostico_conclusiones:
        item.diagnostico_conclusiones || "",
      recomendacion_concepto:
        item.recomendacion_concepto || "",
      nota_seguridad_informacion:
        item.nota_seguridad_informacion || "",

      tecnico_id: item.tecnico_id || "",
      tecnico_area:
        item.tecnico_area || FORM_INICIAL.tecnico_area,
    });

    setError("");
    setMensaje("");
    setModal(true);
  }

  async function guardar(event) {
    event.preventDefault();

    if (!form.activo_id) {
      setError("Selecciona el activo al que corresponde el concepto.");
      return;
    }

    if (!form.tecnico_id) {
      setError("Selecciona el técnico que firma el concepto.");
      return;
    }

    const activo = activos.find((item) => item.id === form.activo_id);
    const tecnico = personas.find((item) => item.id === form.tecnico_id);

    if (!activo) {
      setError("No fue posible obtener la información del activo.");
      return;
    }

    if (!tecnico) {
      setError("No fue posible obtener la información del técnico.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      activo_id: activo.id,
      fecha: form.fecha,

      destinatario_nombre: form.destinatario_nombre.trim(),
      destinatario_oficina: form.destinatario_oficina.trim(),
      destinatario_entidad: form.destinatario_entidad.trim(),
      referencia: form.referencia.trim(),

      tipo_equipo: activo.tipo?.nombre || null,
      asignado_a: activo.responsable
        ? [
            nombrePersona(activo.responsable),
            activo.responsable.cargo,
          ]
            .filter(Boolean)
            .join(" ")
        : null,

      dependencia: activo.dependencia?.nombre || null,
      placa_inventario: activo.codigo,
      marca: activo.marca?.nombre || null,
      modelo: activo.modelo || null,
      numero_serie: activo.serial || null,

      antecedentes_descripcion_falla:
        form.antecedentes_descripcion_falla.trim() || null,

      inspeccion_mantenimiento_correctivo:
        form.inspeccion_mantenimiento_correctivo.trim() || null,

      diagnostico_conclusiones:
        form.diagnostico_conclusiones.trim() || null,

      recomendacion_concepto:
        form.recomendacion_concepto.trim() || null,

      nota_seguridad_informacion:
        form.nota_seguridad_informacion.trim() || null,

      tecnico_id: tecnico.id,
      tecnico_nombre: nombrePersona(tecnico),
      tecnico_cargo: tecnico.cargo || null,
      tecnico_area: form.tecnico_area.trim() || null,
      tecnico_telefono: tecnico.telefono || null,
      tecnico_correo: tecnico.correo || null,
    };

    let respuesta;

    if (editando) {
      respuesta = await supabase
        .from("conceptos_baja")
        .update(payload)
        .eq("id", editando.id);
    } else {
      respuesta = await supabase
        .from("conceptos_baja")
        .insert(payload);
    }

    if (respuesta.error) {
      setError(respuesta.error.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModal(false);
    setMensaje(
      editando
        ? "Concepto actualizado correctamente."
        : "Concepto técnico registrado correctamente.",
    );

    await cargarTodo();
  }

  async function anular(item) {
    if (!puedeGestionar || item.anulado) return;

    const motivo = window.prompt(
      "Indica el motivo de anulación del concepto:",
    );

    if (!motivo?.trim()) return;

    const { error: updateError } = await supabase
      .from("conceptos_baja")
      .update({
        anulado: true,
        motivo_anulacion: motivo.trim(),
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMensaje("Concepto anulado. El registro histórico se conserva.");
    await cargarTodo();
  }

  function imprimir(item) {
    setConceptoImprimir(item);

    window.setTimeout(() => {
      window.print();
    }, 120);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="no-print">
        <section className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Gestión TIC
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Conceptos de baja
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Elaboración y trazabilidad de conceptos técnicos de evaluación,
              diagnóstico y recomendación de baja de equipos tecnológicos.
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Nuevo concepto
            </button>
          )}
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="relative block max-w-xl">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />

            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por placa, funcionario, dependencia, marca..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Cargando conceptos...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Fecha",
                      "Placa",
                      "Tipo",
                      "Asignado a",
                      "Dependencia",
                      "Marca / Modelo",
                      "Serial",
                      "Técnico",
                      "Estado",
                      "",
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
                  {filtrados.map((item) => (
                    <tr
                      key={item.id}
                      className={item.anulado ? "bg-slate-50 opacity-60" : ""}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {item.fecha}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-blue-700">
                        {item.placa_inventario}
                      </td>

                      <td className="min-w-40 px-4 py-3 text-sm text-slate-600">
                        {item.tipo_equipo || "—"}
                      </td>

                      <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                        {item.asignado_a || "—"}
                      </td>

                      <td className="min-w-48 px-4 py-3 text-sm text-slate-600">
                        {item.dependencia || "—"}
                      </td>

                      <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                        {[item.marca, item.modelo].filter(Boolean).join(" / ") || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {item.numero_serie || "—"}
                      </td>

                      <td className="min-w-48 px-4 py-3 text-sm text-slate-600">
                        {item.tecnico_nombre}
                      </td>

                      <td className="px-4 py-3">
                        {item.anulado ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Anulado
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Vigente
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Imprimir"
                            onClick={() => imprimir(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Printer size={16} />
                          </button>

                          {puedeGestionar && !item.anulado && (
                            <>
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => abrirEditar(item)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                title="Anular"
                                onClick={() => anular(item)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              >
                                <Ban size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filtrados.length && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-14 text-center text-sm text-slate-500"
                      >
                        No hay conceptos técnicos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editando ? "Editar concepto técnico" : "Nuevo concepto técnico de baja"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Selecciona el activo y completa libremente cada apartado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardar} className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Campo label="Activo / Placa de inventario">
                    <select
                      value={form.activo_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activo_id: event.target.value,
                        })
                      }
                      className="campo"
                      required
                    >
                      <option value="">Seleccionar activo...</option>

                      {activos.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigo}
                          {item.tipo?.nombre ? ` — ${item.tipo.nombre}` : ""}
                          {item.marca?.nombre ? ` — ${item.marca.nombre}` : ""}
                          {item.modelo ? ` ${item.modelo}` : ""}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Fecha del concepto">
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fecha: event.target.value,
                        })
                      }
                      className="campo"
                      required
                    />
                  </Campo>
                </div>

                {form.activo_id && (
                  <InfoActivo
                    activo={activos.find((item) => item.id === form.activo_id)}
                  />
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">
                    Encabezado del documento
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Campo label="Destinatario">
                      <input
                        value={form.destinatario_nombre}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            destinatario_nombre: event.target.value,
                          })
                        }
                        className="campo"
                      />
                    </Campo>

                    <Campo label="Oficina">
                      <input
                        value={form.destinatario_oficina}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            destinatario_oficina: event.target.value,
                          })
                        }
                        className="campo"
                      />
                    </Campo>

                    <Campo label="Entidad">
                      <input
                        value={form.destinatario_entidad}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            destinatario_entidad: event.target.value,
                          })
                        }
                        className="campo"
                      />
                    </Campo>

                    <Campo label="Referencia">
                      <input
                        value={form.referencia}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            referencia: event.target.value,
                          })
                        }
                        className="campo"
                      />
                    </Campo>
                  </div>
                </div>

                <SeccionEditor
                  titulo="2. ANTECEDENTES Y DESCRIPCIÓN DE LA FALLA"
                  value={form.antecedentes_descripcion_falla}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      antecedentes_descripcion_falla: value,
                    })
                  }
                  placeholder="Escribe aquí los antecedentes, el reporte recibido y la descripción de la falla..."
                />

                <SeccionEditor
                  titulo="3. INSPECCIÓN TÉCNICA Y MANTENIMIENTO CORRECTIVO EJECUTADO"
                  value={form.inspeccion_mantenimiento_correctivo}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      inspeccion_mantenimiento_correctivo: value,
                    })
                  }
                  placeholder="Escribe aquí la inspección, pruebas, desarme, limpieza, mantenimiento y demás actividades realizadas..."
                />

                <SeccionEditor
                  titulo="5. DIAGNÓSTICO FINALES Y CONCLUSIONES"
                  value={form.diagnostico_conclusiones}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      diagnostico_conclusiones: value,
                    })
                  }
                  placeholder="Escribe aquí el resultado de las pruebas, diagnóstico final y conclusiones técnicas..."
                />

                <SeccionEditor
                  titulo="6. RECOMENDACIÓN Y CONCEPTO"
                  value={form.recomendacion_concepto}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      recomendacion_concepto: value,
                    })
                  }
                  placeholder="Escribe aquí la recomendación y el concepto técnico que consideres procedente..."
                />

                <SeccionEditor
                  titulo="NOTA DE SEGURIDAD DE LA INFORMACIÓN (OPCIONAL)"
                  value={form.nota_seguridad_informacion}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      nota_seguridad_informacion: value,
                    })
                  }
                  placeholder="Si aplica, registra aquí información sobre custodia, migración, recuperación o destrucción segura de medios de almacenamiento..."
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">
                    Firma del concepto
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Campo label="Técnico que firma">
                      <select
                        value={form.tecnico_id}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            tecnico_id: event.target.value,
                          })
                        }
                        className="campo"
                        required
                      >
                        <option value="">Seleccionar técnico...</option>

                        {tecnicos.map((item) => (
                          <option key={item.id} value={item.id}>
                            {nombrePersona(item)}
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Área / dependencia que aparecerá en la firma">
                      <input
                        value={form.tecnico_area}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            tecnico_area: event.target.value,
                          })
                        }
                        className="campo"
                      />
                    </Campo>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {guardando ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}

                    {guardando ? "Guardando..." : "Guardar concepto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style>{`
          .campo {
            width: 100%;
            border: 1px solid rgb(203 213 225);
            border-radius: .75rem;
            padding: .625rem .75rem;
            font-size: .875rem;
            outline: none;
            background: white;
          }

          .campo:focus {
            border-color: rgb(59 130 246);
          }

          @media print {
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>

      <div className="hidden print:block">
        <ConceptoBajaImprimible concepto={conceptoImprimir} />
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoActivo({ activo }) {
  if (!activo) return null;

  const responsable = activo.responsable
    ? [
        nombrePersona(activo.responsable),
        activo.responsable.cargo,
      ]
        .filter(Boolean)
        .join(" ")
    : "Sin responsable";

  const datos = [
    ["Tipo de equipo", activo.tipo?.nombre || "—"],
    ["Asignado a", responsable],
    ["Dependencia", activo.dependencia?.nombre || "—"],
    ["Placa de inventario", activo.codigo || "—"],
    [
      "Marca / Modelo",
      [activo.marca?.nombre, activo.modelo].filter(Boolean).join(" – ") || "—",
    ],
    ["Número de serie", activo.serial || "—"],
  ];

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-4 flex items-center gap-2 text-blue-900">
        <FileText size={19} />
        <h3 className="font-bold">
          1. Información general del elemento
        </h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {datos.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-blue-700">
        Estos datos se traen automáticamente desde el activo seleccionado.
      </p>
    </div>
  );
}

function SeccionEditor({
  titulo,
  value,
  onChange,
  placeholder,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        {titulo}
      </h3>

      <textarea
        rows={7}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500"
      />
    </section>
  );
}
