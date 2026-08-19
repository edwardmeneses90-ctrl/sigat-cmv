import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Monitor,
  Pencil,
  Plus,
  Search,
  Printer,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import HojaVidaImprimible from "../components/activos/HojaVidaImprimible";

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

const formularioInicial = {
  codigo: "",
  tipo_activo_id: "",
  marca_id: "",
  modelo: "",
  serial: "",
  nombre_equipo: "",
  procesador: "",
  memoria_ram: "",
  almacenamiento: "",
  monitor: "",
  tarjeta_grafica: "",
  otros_componentes: "",
  sistema_operativo: "",
  licencia_sistema_operativo: "",
  suite_oficina: "",
  antivirus: "",
  fecha_inicio_licencia_antivirus: "",
  otro_software: "",
  fecha_ultimo_mantenimiento: "",
  direccion_ip: "",
  direccion_mac: "",
  fecha_compra: "",
  proveedor: "",
  numero_factura: "",
  valor_compra: "",
  fecha_fin_garantia: "",
  estado: "DISPONIBLE",
  dependencia_id: "",
  responsable_id: "",
  observaciones: "",
};

function etiquetaEstado(valor) {
  return ESTADOS.find(([key]) => key === valor)?.[1] || valor;
}

function nombrePersona(persona) {
  if (!persona) return "Sin asignar";
  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ");
}

export default function Activos() {
  const { perfil } = useAuth();
  const puedeGestionar =
    perfil?.rol === "ADMIN" || perfil?.rol === "TECNICO";

  const [activos, setActivos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [personas, setPersonas] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDependencia, setFiltroDependencia] = useState("");

  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [detalleActivo, setDetalleActivo] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [soportesActivo, setSoportesActivo] = useState([]);
  const [datosReporte, setDatosReporte] = useState({ movimientos: [], mantenimientos: [], soportes: [] });
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const [
      resActivos,
      resTipos,
      resMarcas,
      resDependencias,
      resPersonas,
    ] = await Promise.all([
      supabase
        .from("activos")
        .select(`
          id, codigo, tipo_activo_id, marca_id, modelo, serial, nombre_equipo,
          procesador, memoria_ram, almacenamiento, monitor, tarjeta_grafica,
          otros_componentes, sistema_operativo, licencia_sistema_operativo,
          suite_oficina, antivirus, fecha_inicio_licencia_antivirus,
          otro_software, fecha_ultimo_mantenimiento,
          direccion_ip, direccion_mac, fecha_compra, proveedor, numero_factura,
          valor_compra, fecha_fin_garantia, estado, dependencia_id,
          responsable_id, observaciones,
          tipos_activo(nombre, prefijo),
          marcas(nombre),
          dependencias(nombre),
          personas(nombres, apellidos, cargo)
        `)
        .order("codigo", { ascending: true }),

      supabase.from("tipos_activo").select("id, nombre, prefijo, activo").order("nombre"),
      supabase.from("marcas").select("id, nombre, activo").order("nombre"),
      supabase.from("dependencias").select("id, nombre, activo").order("nombre"),
      supabase
        .from("personas")
        .select("id, nombres, apellidos, dependencia_id, activo")
        .order("nombres"),
    ]);

    if (resActivos.error) setError(resActivos.error.message);
    setActivos(resActivos.data || []);
    setTipos(resTipos.data || []);
    setMarcas(resMarcas.data || []);
    setDependencias(resDependencias.data || []);
    setPersonas(resPersonas.data || []);

    const errores = [
      resTipos.error,
      resMarcas.error,
      resDependencias.error,
      resPersonas.error,
    ].filter(Boolean);

    if (errores.length) setError(errores[0].message);

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirDetalle(activo) {
    setDetalleActivo(activo);
    setHistorial([]);
    setSoportesActivo([]);
    setDatosReporte({ movimientos: [], mantenimientos: [], soportes: [] });
    setErrorHistorial("");
    setCargandoHistorial(true);

    const [movRes, mantRes, sopRes, conRes] = await Promise.all([
      supabase
        .from("movimientos_activo")
        .select(`
          id, tipo_movimiento, fecha_movimiento, observaciones,
          dependencia_origen:dependencias!movimientos_activo_dependencia_origen_id_fkey(nombre),
          dependencia_destino:dependencias!movimientos_activo_dependencia_destino_id_fkey(nombre),
          responsable_origen:personas!movimientos_activo_responsable_origen_id_fkey(nombres, apellidos),
          responsable_destino:personas!movimientos_activo_responsable_destino_id_fkey(nombres, apellidos)
        `)
        .eq("activo_id", activo.id),

      supabase
        .from("mantenimientos")
        .select(`
          id,
          solicitud_id,
          tipo,
          fecha_mantenimiento,
          tecnico_proveedor,
          diagnostico,
          trabajo_realizado,
          repuestos,
          costo,
          proximo_mantenimiento,
          observaciones,
          solicitudes_servicio(numero_ticket)
        `)
        .eq("activo_id", activo.id),

      supabase
        .from("soportes_tecnicos")
        .select(`
          id,
          solicitud_id,
          activo_id,
          fecha,
          tipo_soporte,
          actividad_realizada,
          dependencia_nombre,
          tecnico_nombre,
          solicitante_nombre,
          observaciones,
          anulado,
          motivo_anulacion,
          solicitudes_servicio(numero_ticket)
        `)
        .eq("activo_id", activo.id)
        .order("fecha", { ascending: false }),

      supabase
        .from("conceptos_baja")
        .select(`
          id,
          fecha,
          referencia,
          diagnostico_conclusiones,
          recomendacion_concepto,
          tecnico_nombre,
          anulado
        `)
        .eq("activo_id", activo.id)
        .eq("anulado", false)
        .order("fecha", { ascending: false }),
    ]);
    const errores = [
      movRes.error,
      mantRes.error,
      sopRes.error,
      conRes.error,
    ].filter(Boolean);

    if (errores.length) {
      setErrorHistorial(errores[0].message);
      setCargandoHistorial(false);
      return;
    }

    const soportesVigentes = (sopRes.data || []).filter(
      (item) => item.anulado !== true,
    );

    setSoportesActivo(soportesVigentes);

    setDatosReporte({
      movimientos: movRes.data || [],
      mantenimientos: mantRes.data || [],
      soportes: soportesVigentes,
    });

    const eventos = [
      ...(movRes.data || []).map((item) => ({
        id: `mov-${item.id}`,
        fecha: item.fecha_movimiento,
        categoria: "Movimiento",
        titulo:
          item.tipo_movimiento === "ASIGNACION"
            ? "Asignación"
            : item.tipo_movimiento === "TRASLADO"
              ? "Traslado"
              : "Devolución",
        detalle: [
          `Origen: ${item.dependencia_origen?.nombre || "Sin dependencia"} / ${nombrePersona(item.responsable_origen)}`,
          `Destino: ${item.dependencia_destino?.nombre || "Sin dependencia"} / ${nombrePersona(item.responsable_destino)}`,
        ].join(" | "),
        observaciones: item.observaciones || "",
      })),

      ...(mantRes.data || []).map((item) => ({
        id: `mant-${item.id}`,
        fecha: `${item.fecha_mantenimiento}T12:00:00`,
        categoria: "Mantenimiento",
        titulo:
          item.tipo === "PREVENTIVO"
            ? "Mantenimiento preventivo"
            : "Mantenimiento correctivo",
        detalle: [
          item.solicitudes_servicio?.numero_ticket
            ? `Ticket: ${item.solicitudes_servicio.numero_ticket}`
            : "",
          item.tecnico_proveedor
            ? `Técnico/Proveedor: ${item.tecnico_proveedor}`
            : "",
          item.diagnostico
            ? `Diagnóstico: ${item.diagnostico}`
            : "",
          item.trabajo_realizado
            ? `Trabajo: ${item.trabajo_realizado}`
            : "",
          item.repuestos
            ? `Repuestos: ${item.repuestos}`
            : "",
        ]
          .filter(Boolean)
          .join(" | "),
        observaciones: item.observaciones || "",
      })),


      ...soportesVigentes.map((item) => ({
        id: `sop-${item.id}`,
        fecha: `${item.fecha}T12:00:00`,
        categoria: "Soporte técnico",
        titulo: item.tipo_soporte || "Soporte técnico",
        detalle: [
          item.solicitudes_servicio?.numero_ticket
            ? `Ticket: ${item.solicitudes_servicio.numero_ticket}`
            : "",
          item.actividad_realizada
            ? `Actividad: ${item.actividad_realizada}`
            : "",
          item.dependencia_nombre
            ? `Dependencia: ${item.dependencia_nombre}`
            : "",
          item.tecnico_nombre
            ? `Realizado por: ${item.tecnico_nombre}`
            : "",
          item.solicitante_nombre
            ? `Solicitante: ${item.solicitante_nombre}`
            : "",
        ]
          .filter(Boolean)
          .join(" | "),
        observaciones: item.observaciones || "",
      })),

      ...(conRes.data || []).map((item) => ({
        id: `concepto-${item.id}`,
        fecha: `${item.fecha}T12:00:00`,
        categoria: "Concepto de baja",
        titulo: item.referencia || "Concepto técnico de baja",
        detalle: [
          item.diagnostico_conclusiones
            ? `Diagnóstico: ${item.diagnostico_conclusiones}`
            : "",
          item.recomendacion_concepto
            ? `Concepto: ${item.recomendacion_concepto}`
            : "",
          item.tecnico_nombre
            ? `Elaborado por: ${item.tecnico_nombre}`
            : "",
        ]
          .filter(Boolean)
          .join(" | "),
        observaciones: "",
      })),
    ].sort(
      (a, b) =>
        new Date(b.fecha).getTime() -
        new Date(a.fecha).getTime(),
    );

    setHistorial(eventos);
    setCargandoHistorial(false);
  }

  function abrirNuevo() {
    setFormulario(formularioInicial);
    setEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function abrirEditar(activo) {
    setFormulario({
      codigo: activo.codigo || "",
      tipo_activo_id: activo.tipo_activo_id || "",
      marca_id: activo.marca_id || "",
      modelo: activo.modelo || "",
      serial: activo.serial || "",
      nombre_equipo: activo.nombre_equipo || "",
      procesador: activo.procesador || "",
      memoria_ram: activo.memoria_ram || "",
      almacenamiento: activo.almacenamiento || "",
      monitor: activo.monitor || "",
      tarjeta_grafica: activo.tarjeta_grafica || "",
      otros_componentes: activo.otros_componentes || "",
      sistema_operativo: activo.sistema_operativo || "",
      licencia_sistema_operativo: activo.licencia_sistema_operativo || "",
      suite_oficina: activo.suite_oficina || "",
      antivirus: activo.antivirus || "",
      fecha_inicio_licencia_antivirus: activo.fecha_inicio_licencia_antivirus || "",
      otro_software: activo.otro_software || "",
      fecha_ultimo_mantenimiento: activo.fecha_ultimo_mantenimiento || "",
      direccion_ip: activo.direccion_ip || "",
      direccion_mac: activo.direccion_mac || "",
      fecha_compra: activo.fecha_compra || "",
      proveedor: activo.proveedor || "",
      numero_factura: activo.numero_factura || "",
      valor_compra:
        activo.valor_compra == null ? "" : String(activo.valor_compra),
      fecha_fin_garantia: activo.fecha_fin_garantia || "",
      estado: activo.estado || "DISPONIBLE",
      dependencia_id: activo.dependencia_id || "",
      responsable_id: activo.responsable_id || "",
      observaciones: activo.observaciones || "",
    });

    setEditando(activo);
    setDetalleActivo(null);
    setMostrarFormulario(true);
  }

  function actualizarCampo(key, valor) {
    setFormulario((actual) => ({
      ...actual,
      [key]: valor,
    }));
  }

  function cambiarResponsable(personaId) {
    const persona = personas.find((item) => item.id === personaId);

    setFormulario((actual) => ({
      ...actual,
      responsable_id: personaId,
      dependencia_id:
        persona?.dependencia_id || actual.dependencia_id || "",
      estado:
        personaId && actual.estado === "DISPONIBLE"
          ? "ASIGNADO"
          : actual.estado,
    }));
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      codigo: formulario.codigo.trim().toUpperCase(),
      tipo_activo_id: formulario.tipo_activo_id,
      marca_id: formulario.marca_id || null,
      modelo: formulario.modelo.trim() || null,
      serial: formulario.serial.trim() || null,
      nombre_equipo: formulario.nombre_equipo.trim() || null,
      procesador: formulario.procesador.trim() || null,
      memoria_ram: formulario.memoria_ram.trim() || null,
      almacenamiento: formulario.almacenamiento.trim() || null,
      monitor: formulario.monitor.trim() || null,
      tarjeta_grafica: formulario.tarjeta_grafica.trim() || null,
      otros_componentes: formulario.otros_componentes.trim() || null,
      sistema_operativo: formulario.sistema_operativo.trim() || null,
      licencia_sistema_operativo: formulario.licencia_sistema_operativo.trim() || null,
      suite_oficina: formulario.suite_oficina.trim() || null,
      antivirus: formulario.antivirus.trim() || null,
      fecha_inicio_licencia_antivirus: formulario.fecha_inicio_licencia_antivirus || null,
      otro_software: formulario.otro_software.trim() || null,
      fecha_ultimo_mantenimiento: formulario.fecha_ultimo_mantenimiento || null,
      direccion_ip: formulario.direccion_ip.trim() || null,
      direccion_mac: formulario.direccion_mac.trim() || null,
      fecha_compra: formulario.fecha_compra || null,
      proveedor: formulario.proveedor.trim() || null,
      numero_factura: formulario.numero_factura.trim() || null,
      valor_compra:
        formulario.valor_compra === ""
          ? null
          : Number(formulario.valor_compra),
      fecha_fin_garantia: formulario.fecha_fin_garantia || null,
      estado: formulario.estado,
      dependencia_id: formulario.dependencia_id || null,
      responsable_id: formulario.responsable_id || null,
      observaciones: formulario.observaciones.trim() || null,
    };

    const resultado = editando
      ? await supabase.from("activos").update(payload).eq("id", editando.id)
      : await supabase.from("activos").insert(payload);

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      editando
        ? "Activo actualizado correctamente."
        : "Activo registrado correctamente.",
    );

    setMostrarFormulario(false);
    setFormulario(formularioInicial);
    setEditando(null);
    setGuardando(false);
    await cargar();
  }

  const activosFiltrados = useMemo(() => {
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
        ].some((valor) =>
          String(valor ?? "").toLowerCase().includes(texto),
        );

      return (
        coincideTexto &&
        (!filtroTipo || activo.tipo_activo_id === filtroTipo) &&
        (!filtroEstado || activo.estado === filtroEstado) &&
        (!filtroDependencia ||
          activo.dependencia_id === filtroDependencia)
      );
    });
  }, [
    activos,
    busqueda,
    filtroTipo,
    filtroEstado,
    filtroDependencia,
  ]);

  const personasDisponibles = personas.filter(
    (p) => p.activo || p.id === formulario.responsable_id,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Inventario
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Activos tecnológicos
        </h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Inventario
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {activos.length} activo(s) registrado(s).
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={18} />
              Nuevo activo
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search size={17} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Placa, serial, modelo..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">Todos los tipos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>

          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">Todos los estados</option>
            {ESTADOS.map(([k,l]) => <option key={k} value={k}>{l}</option>)}
          </select>

          <select value={filtroDependencia} onChange={(e) => setFiltroDependencia(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">Todas las dependencias</option>
            {dependencias.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>

        {mensaje && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={17} />
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mostrarFormulario && (
          <form onSubmit={guardar} className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">
                {editando ? "Editar activo" : "Nuevo activo"}
              </h4>
              <button type="button" onClick={() => setMostrarFormulario(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Campo label="Placa de inventario *" value={formulario.codigo} onChange={(v)=>actualizarCampo("codigo",v)} required />
              <SelectCampo label="Tipo de activo *" value={formulario.tipo_activo_id} onChange={(v)=>actualizarCampo("tipo_activo_id",v)} required>
                <option value="">Seleccionar tipo</option>
                {tipos.filter(t=>t.activo || t.id===formulario.tipo_activo_id).map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
              </SelectCampo>
              <SelectCampo label="Marca" value={formulario.marca_id} onChange={(v)=>actualizarCampo("marca_id",v)}>
                <option value="">Sin marca</option>
                {marcas.filter(m=>m.activo || m.id===formulario.marca_id).map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
              </SelectCampo>

              {[
                ["modelo","Modelo"],
                ["serial","Serial"],
                ["nombre_equipo","Nombre del equipo"],
              ].map(([k,l])=><Campo key={k} label={l} value={formulario[k]} onChange={(v)=>actualizarCampo(k,v)} />)}

              <div className="md:col-span-2 xl:col-span-3 mt-2">
                <h5 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Especificaciones técnicas - Hardware
                </h5>
              </div>

              {[
                ["procesador","Procesador"],
                ["memoria_ram","Memoria RAM"],
                ["almacenamiento","Almacenamiento principal"],
                ["monitor","Monitor"],
                ["tarjeta_grafica","Tarjeta gráfica (si aplica)"],
                ["otros_componentes","Otros componentes / periféricos"],
                ["direccion_ip","Dirección IP"],
                ["direccion_mac","Dirección MAC"],
              ].map(([k,l])=><Campo key={k} label={l} value={formulario[k]} onChange={(v)=>actualizarCampo(k,v)} />)}

              <div className="md:col-span-2 xl:col-span-3 mt-2">
                <h5 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Especificaciones técnicas - Software
                </h5>
              </div>

              {[
                ["sistema_operativo","Sistema operativo"],
                ["licencia_sistema_operativo","Licencia del sistema operativo"],
                ["suite_oficina","Suite de oficina"],
                ["antivirus","Antivirus"],
              ].map(([k,l])=><Campo key={k} label={l} value={formulario[k]} onChange={(v)=>actualizarCampo(k,v)} />)}

              <label className="text-sm font-medium text-slate-700">
                Fecha inicio licencia antivirus
                <input
                  type="date"
                  value={formulario.fecha_inicio_licencia_antivirus}
                  onChange={(e)=>actualizarCampo("fecha_inicio_licencia_antivirus", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>

              <Campo
                label="Otro software institucional clave"
                value={formulario.otro_software}
                onChange={(v)=>actualizarCampo("otro_software",v)}
              />

              <label className="text-sm font-medium text-slate-700">
                Fecha último mantenimiento
                <input
                  type="date"
                  value={formulario.fecha_ultimo_mantenimiento}
                  onChange={(e)=>actualizarCampo("fecha_ultimo_mantenimiento", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>

              {[
                ["proveedor","Proveedor"],
                ["numero_factura","Número de factura"],
              ].map(([k,l])=><Campo key={k} label={l} value={formulario[k]} onChange={(v)=>actualizarCampo(k,v)} />)}

              <Campo label="Fecha de compra" type="date" value={formulario.fecha_compra} onChange={(v)=>actualizarCampo("fecha_compra",v)} />
              <Campo label="Valor de compra" type="number" value={formulario.valor_compra} onChange={(v)=>actualizarCampo("valor_compra",v)} min="0" step="0.01" />
              <Campo label="Fin de garantía" type="date" value={formulario.fecha_fin_garantia} onChange={(v)=>actualizarCampo("fecha_fin_garantia",v)} />

              <SelectCampo label="Estado *" value={formulario.estado} onChange={(v)=>actualizarCampo("estado",v)} required>
                {ESTADOS.map(([k,l])=><option key={k} value={k}>{l}</option>)}
              </SelectCampo>

              <SelectCampo label="Dependencia" value={formulario.dependencia_id} onChange={(v)=>actualizarCampo("dependencia_id",v)}>
                <option value="">Sin dependencia</option>
                {dependencias.filter(d=>d.activo || d.id===formulario.dependencia_id).map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
              </SelectCampo>

              <SelectCampo label="Funcionario responsable" value={formulario.responsable_id} onChange={cambiarResponsable}>
                <option value="">Sin asignar</option>
                {personasDisponibles.map(p=><option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </SelectCampo>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Observaciones
              <textarea rows="3" value={formulario.observaciones} onChange={(e)=>actualizarCampo("observaciones",e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={()=>setMostrarFormulario(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
                {guardando ? "Guardando..." : "Guardar activo"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Placa de inventario","Tipo","Marca / Modelo","Serial","Dependencia","Responsable","Estado"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                {puedeGestionar && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {cargando ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">Cargando...</td></tr>
              ) : activosFiltrados.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">No hay activos.</td></tr>
              ) : (
                activosFiltrados.map((a)=>(
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm">
                      <button type="button" onClick={()=>abrirDetalle(a)} className="font-semibold text-blue-700 hover:underline">
                        {a.codigo}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{a.tipos_activo?.nombre || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{a.marcas?.nombre || "—"}</p>
                      <p className="text-xs text-slate-400">{a.modelo || "Sin modelo"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{a.serial || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{a.dependencias?.nombre || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{nombrePersona(a.personas)}</td>
                    <td className="px-4 py-3 text-sm"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{etiquetaEstado(a.estado)}</span></td>
                    {puedeGestionar && (
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={()=>abrirEditar(a)} className="rounded-lg border border-slate-200 p-2">
                          <Pencil size={16}/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detalleActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Hoja de vida del activo
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  Placa {detalleActivo.codigo}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={cargandoHistorial}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Imprimir hoja de vida institucional"
                >
                  <Printer size={17}/>
                  Imprimir hoja de vida
                </button>
                <button type="button" onClick={()=>setDetalleActivo(null)} className="rounded-lg p-2 hover:bg-slate-100">
                  <X size={20}/>
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <SeccionDetalle
                titulo="Información general"
                items={[
                  ["Placa", detalleActivo.codigo],
                  ["Tipo", detalleActivo.tipos_activo?.nombre],
                  ["Marca", detalleActivo.marcas?.nombre],
                  ["Modelo", detalleActivo.modelo],
                  ["Serial", detalleActivo.serial],
                  ["Nombre del equipo", detalleActivo.nombre_equipo],
                  ["Estado", etiquetaEstado(detalleActivo.estado)],
                ]}
              />

              <SeccionDetalle
                titulo="Características técnicas"
                items={[
                  ["Procesador", detalleActivo.procesador],
                  ["Memoria RAM", detalleActivo.memoria_ram],
                  ["Almacenamiento principal", detalleActivo.almacenamiento],
                  ["Monitor", detalleActivo.monitor],
                  ["Tarjeta gráfica", detalleActivo.tarjeta_grafica],
                  ["Otros componentes / periféricos", detalleActivo.otros_componentes],
                  ["Dirección IP", detalleActivo.direccion_ip],
                  ["Dirección MAC", detalleActivo.direccion_mac],
                  ["Sistema operativo", detalleActivo.sistema_operativo],
                  ["Licencia del sistema operativo", detalleActivo.licencia_sistema_operativo],
                  ["Suite de oficina", detalleActivo.suite_oficina],
                  ["Antivirus", detalleActivo.antivirus],
                  ["Fecha inicio licencia antivirus", detalleActivo.fecha_inicio_licencia_antivirus],
                  ["Otro software institucional clave", detalleActivo.otro_software],
                  ["Fecha último mantenimiento", detalleActivo.fecha_ultimo_mantenimiento],
                ]}
              />

              <SeccionDetalle
                titulo="Asignación actual"
                items={[
                  ["Dependencia", detalleActivo.dependencias?.nombre],
                  ["Funcionario responsable", nombrePersona(detalleActivo.personas)],
                ]}
              />

              <SeccionDetalle
                titulo="Compra y garantía"
                items={[
                  ["Fecha de compra", detalleActivo.fecha_compra],
                  ["Proveedor", detalleActivo.proveedor],
                  ["Número de factura", detalleActivo.numero_factura],
                  [
                    "Valor de compra",
                    detalleActivo.valor_compra == null
                      ? null
                      : new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(detalleActivo.valor_compra),
                  ],
                  ["Fin de garantía", detalleActivo.fecha_fin_garantia],
                ]}
              />

              <section className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Soportes técnicos del activo
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Registros de soporte relacionados directamente con la placa {detalleActivo.codigo}.
                    </p>
                  </div>

                  <span className="self-start rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {soportesActivo.length} soporte{soportesActivo.length === 1 ? "" : "s"}
                  </span>
                </div>

                {cargandoHistorial ? (
                  <div className="mt-4 rounded-xl bg-white px-4 py-5 text-center text-sm text-slate-500">
                    Cargando soportes...
                  </div>
                ) : soportesActivo.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
                    Este activo todavía no tiene soportes técnicos relacionados.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {soportesActivo.map((soporte) => (
                      <div
                        key={soporte.id}
                        className="rounded-xl border border-blue-100 bg-white p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {soporte.tipo_soporte || "Soporte técnico"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {soporte.tecnico_nombre
                                ? `Realizado por: ${soporte.tecnico_nombre}`
                                : "Sin técnico registrado"}
                            </p>
                          </div>

                          <p className="text-xs font-medium text-blue-700">
                            {soporte.fecha
                              ? new Date(`${soporte.fecha}T12:00:00`).toLocaleDateString()
                              : "Sin fecha"}
                          </p>
                        </div>

                        {soporte.actividad_realizada && (
                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            {soporte.actividad_realizada}
                          </p>
                        )}

                        <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-slate-600">
                              Dependencia:
                            </span>{" "}
                            {soporte.dependencia_nombre || "—"}
                          </p>

                          <p>
                            <span className="font-semibold text-slate-600">
                              Solicitante:
                            </span>{" "}
                            {soporte.solicitante_nombre || "—"}
                          </p>
                        </div>

                        {soporte.observaciones && (
                          <p className="mt-3 text-xs italic text-slate-500">
                            Observación: {soporte.observaciones}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">
                  Historial completo del activo
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  Movimientos, mantenimientos, soportes técnicos y conceptos de baja.
                </p>

                {cargandoHistorial ? (
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Cargando historial...
                  </div>
                ) : errorHistorial ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorHistorial}
                  </div>
                ) : historial.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No hay eventos registrados.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {historial.map((evento) => (
                      <div
                        key={evento.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {evento.categoria}
                            </span>
                            <p className="font-semibold text-slate-900">
                              {evento.titulo}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400">
                            {new Date(evento.fecha).toLocaleString()}
                          </p>
                        </div>

                        {evento.detalle && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {evento.detalle}
                          </p>
                        )}

                        {evento.observaciones && (
                          <p className="mt-2 text-sm italic text-slate-500">
                            Observación: {evento.observaciones}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Observaciones generales
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {detalleActivo.observaciones || "Sin observaciones."}
                </p>
              </div>

              {puedeGestionar && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={()=>abrirEditar(detalleActivo)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Pencil size={17}/>
                    Editar activo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detalleActivo && (
        <HojaVidaImprimible
          activo={detalleActivo}
          movimientos={datosReporte.movimientos}
          mantenimientos={datosReporte.mantenimientos}
          soportes={datosReporte.soportes}
        />
      )}
    </div>
  );
}

function SeccionDetalle({ titulo, items }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h4 className="font-semibold text-slate-900">{titulo}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-medium text-slate-700">
              {value || "—"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Campo({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  min,
  step,
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        min={min}
        step={step}
        onChange={(e)=>onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function SelectCampo({
  label,
  value,
  onChange,
  required = false,
  children,
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        required={required}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      >
        {children}
      </select>
    </label>
  );
}
