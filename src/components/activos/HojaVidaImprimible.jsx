import React from "react";

const VACIO = "";

function texto(valor) {
  return valor == null || String(valor).trim() === "" ? VACIO : String(valor);
}

function fecha(valor) {
  if (!valor) return VACIO;
  const soloFecha = String(valor).slice(0, 10);
  const [y, m, d] = soloFecha.split("-");
  return y && m && d ? `${d}/${m}/${y}` : valor;
}

function nombrePersona(persona) {
  if (!persona) return "";
  return [persona.nombres, persona.apellidos].filter(Boolean).join(" ");
}


function encabezado(pagina) {
  return (
    <table className="hv-header">
      <tbody>
        <tr>
          <td rowSpan="4" className="hv-logo-cell">
            <img src="/logo-concejo-villavicencio.png" alt="Concejo Municipal de Villavicencio" />
          </td>
          <td className="hv-org" rowSpan="2">CONCEJO MUNICIPAL DE<br />VILLAVICENCIO</td>
          <td className="hv-head-label">CÓDIGO:</td>
          <td>FOR-GESTIC-01</td>
        </tr>
        <tr>
          <td className="hv-head-label">VERSIÓN:</td>
          <td>04</td>
        </tr>
        <tr>
          <td className="hv-org">PROCESO GESTIÓN TIC</td>
          <td className="hv-head-label">VIGENCIA:</td>
          <td>05/05/2025</td>
        </tr>
        <tr>
          <td className="hv-org">FORMATO HOJA DE VIDA DE LOS<br />EQUIPOS TECNOLOGICOS</td>
          <td colSpan="2" className="hv-page-num">Página {pagina} de 4</td>
        </tr>
      </tbody>
    </table>
  );
}

function titulo(textoTitulo) {
  return <div className="hv-section-title">{textoTitulo}</div>;
}

function fila(label, value, hint = "") {
  return (
    <tr>
      <td className="hv-label"><strong>{label}</strong>{hint ? <> <span className="hv-hint">{hint}</span></> : null}</td>
      <td className="hv-value">{texto(value)}</td>
    </tr>
  );
}

function filasVacias(cantidad, columnas) {
  return Array.from({ length: cantidad }, (_, index) => (
    <tr key={`v-${columnas}-${index}`} className="hv-empty-row">
      {Array.from({ length: columnas }, (__, col) => <td key={col}>&nbsp;</td>)}
    </tr>
  ));
}

export default function HojaVidaImprimible({ activo, movimientos = [], mantenimientos = [], soportes = [] }) {
  if (!activo) return null;

  const movimientosOrdenados = [...movimientos].sort(
    (a, b) => new Date(a.fecha_movimiento) - new Date(b.fecha_movimiento),
  );

  const eventos = [
    ...mantenimientos.map((m) => ({
      id: `m-${m.id}`,
      fecha: m.fecha_mantenimiento,
      tipo:
        m.tipo === "PREVENTIVO"
          ? "Mantenimiento Preventivo"
          : "Mantenimiento Correctivo",
      descripcion: [
        m.solicitudes_servicio?.numero_ticket
          ? `Ticket: ${m.solicitudes_servicio.numero_ticket}`
          : "",
        m.diagnostico ? `Diagnóstico: ${m.diagnostico}` : "",
        m.trabajo_realizado
          ? `Trabajo realizado: ${m.trabajo_realizado}`
          : "",
        m.repuestos ? `Repuestos: ${m.repuestos}` : "",
        m.observaciones
          ? `Observaciones: ${m.observaciones}`
          : "",
      ]
        .filter(Boolean)
        .join(". "),
      realizadoPor: m.tecnico_proveedor || "",
    })),

    ...soportes
      .filter((s) => s.anulado !== true)
      .map((s) => ({
        id: `s-${s.id}`,
        fecha: s.fecha,
        tipo: s.tipo_soporte
          ? `Soporte Técnico / ${s.tipo_soporte}`
          : "Soporte Técnico",
        descripcion: [
          s.solicitudes_servicio?.numero_ticket
            ? `Ticket: ${s.solicitudes_servicio.numero_ticket}`
            : "",
          s.actividad_realizada
            ? `Actividad realizada: ${s.actividad_realizada}`
            : "",
          s.solicitante_nombre
            ? `Solicitante: ${s.solicitante_nombre}`
            : "",
          s.observaciones
            ? `Observaciones: ${s.observaciones}`
            : "",
        ]
          .filter(Boolean)
          .join(". "),
        realizadoPor: s.tecnico_nombre || "",
      })),
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const eventosPagina2 = eventos.slice(0, 13);
  const eventosPagina3 = eventos.slice(13, 21);
  const movimientosPagina3 = movimientosOrdenados.slice(0, 8);

  const ultimaAsignacion = [...movimientosOrdenados]
    .reverse()
    .find((m) => m.tipo_movimiento === "ASIGNACION" || m.tipo_movimiento === "TRASLADO");

  const asignado = activo.personas;
  const ubicacion = activo.dependencias?.nombre || "";
  const conectividad = [
    activo.direccion_ip ? `IP: ${activo.direccion_ip}` : "",
    activo.direccion_mac ? `MAC: ${activo.direccion_mac}` : "",
  ].filter(Boolean).join(" | ");

  return (
    <div id="hoja-vida-print" className="sigat-print-report">
      <style>{`
        .sigat-print-report { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #hoja-vida-print, #hoja-vida-print * { visibility: visible !important; }
          #hoja-vida-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .hv-page {
            width: 100%;
            min-height: 277mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            font-size: 10.2pt;
          }
          .hv-page:last-child { page-break-after: auto; break-after: auto; }
          .hv-header { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8mm; }
          .hv-header td { border: 1px solid #222; padding: 2px 5px; text-align: center; vertical-align: middle; }
          .hv-logo-cell { width: 19%; }
          .hv-logo-cell img { width: 100%; max-height: 27mm; object-fit: contain; }
          .hv-org { width: 46%; font-weight: 700; font-size: 11pt; }
          .hv-head-label { width: 14%; font-weight: 700; }
          .hv-page-num { font-weight: 700; }
          .hv-section-title {
            border: 1px solid #222;
            background: #d0d0d0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-align: center;
            font-weight: 700;
            font-size: 11.5pt;
            padding: 2px 4px;
          }
          .hv-two-col, .hv-events, .hv-moves { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .hv-two-col td, .hv-events th, .hv-events td, .hv-moves th, .hv-moves td {
            border: 1px solid #222;
            padding: 3px 5px;
            vertical-align: top;
          }
          .hv-two-col .hv-label { width: 50%; line-height: 1.25; }
          .hv-two-col .hv-value { width: 50%; min-height: 7mm; }
          .hv-hint { font-weight: 400; }
          .hv-spacer { height: 11mm; }
          .hv-spacer-small { height: 6mm; }
          .hv-events th, .hv-moves th { text-align: center; font-weight: 700; line-height: 1.2; }
          .hv-events td, .hv-moves td { line-height: 1.15; }
          .hv-events .date { width: 20%; }
          .hv-events .type { width: 26%; }
          .hv-events .desc { width: 25%; }
          .hv-events .doneby { width: 20%; }
          .hv-events .sign { width: 9%; }
          .hv-event-row { height: 8.5mm; }
          .hv-event-row td { font-size: 8.8pt; }
          .hv-empty-row { height: 7.8mm; }
          .hv-moves th, .hv-moves td { font-size: 8.8pt; }
          .hv-move-row { height: 8mm; }
          .hv-general-box {
            border: 2px solid #111;
            height: 67mm;
            padding: 5mm;
            box-sizing: border-box;
          }
          .hv-line { border-bottom: 1px solid #777; height: 7mm; }
          .hv-placa {
            margin-top: -4mm;
            margin-bottom: 4mm;
            text-align: right;
            font-size: 9pt;
            font-weight: 700;
          }
        }
      `}</style>

      <section className="hv-page">
        {encabezado(1)}
        <div className="hv-placa">Placa de inventario: {activo.codigo || ""}</div>
        {titulo("IDENTIFICACIÓN GENERAL Y ASIGNACIÓN")}
        <table className="hv-two-col"><tbody>
          {fila("Tipo de Equipo:", activo.tipos_activo?.nombre, "(Ej.: Computador de Escritorio, Portátil, Impresora, Monitor, Servidor, Tablet, Smartphone, etc.)")}
          {fila("Marca:", activo.marcas?.nombre)}
          {fila("Modelo:", activo.modelo)}
          {fila("Número de Serie:", activo.serial)}
          {fila("Ubicación Actual:", ubicacion, "(Especificar dependencia, oficina o sala)")}
          {fila("Usuario Principal Asignado:", nombrePersona(asignado), "(Nombre completo del funcionario/contratista)")}
          {fila("Cargo del Usuario:", asignado?.cargo)}
          {fila("Fecha de Asignación a Usuario Actual:", fecha(ultimaAsignacion?.fecha_movimiento))}
        </tbody></table>

        <div className="hv-spacer" />
        {titulo("ESPECIFICACIONES TÉCNICAS (HARDWARE)")}
        <table className="hv-two-col"><tbody>
          {fila("Procesador:", activo.procesador, "(Ej.: Intel Core i5, AMD Ryzen 7, Velocidad, Generación)")}
          {fila("Memoria RAM:", activo.memoria_ram, "(Capacidad en GB, Tipo - Ej.: DDR4)")}
          {fila("Almacenamiento Principal:", activo.almacenamiento, "(Tipo - Ej.: SSD, HDD; Capacidad en GB/TB)")}
          {fila("Monitor:", activo.monitor, "(Marca, Modelo, Tamaño en pulgadas, Resolución nativa)")}
          {fila("Tarjeta Gráfica (si aplica):", activo.tarjeta_grafica, "(Marca, Modelo, Memoria dedicada)")}
          {fila("Conectividad de Red:", conectividad, "(Ethernet - Velocidad, Wi-Fi - Estándar, Bluetooth - Versión)")}
          {fila("Otros Componentes/Periféricos:", activo.otros_componentes, "(Ej.: Cámara web integrada/externa, Teclado, Mouse - Marca y Modelo si son externos y relevantes)")}
        </tbody></table>
      </section>

      <section className="hv-page">
        {encabezado(2)}
        {titulo("ESPECIFICACIONES TÉCNICAS (SOFTWARE PRINCIPAL)")}
        <table className="hv-two-col"><tbody>
          {fila("Sistema Operativo:", activo.sistema_operativo, "(Nombre, Versión, Edición - Ej.: Windows 10 Pro, macOS Ventura, Ubuntu LTS)")}
          {fila("Licencia del Sistema Operativo:", activo.licencia_sistema_operativo, "(Tipo de Licencia, Clave - gestionar según políticas de seguridad)")}
          {fila("Suite de Oficina:", activo.suite_oficina, "(Ej: Microsoft 365, LibreOffice; Versión, Tipo de Licencia)")}
          {fila("Antivirus:", activo.antivirus, "(Nombre, Versión, Estado de la Licencia)")}
          {fila("Otro Software Institucional Clave:", activo.otro_software, "(Listar software relevante con nombre y versión)")}
        </tbody></table>

        <div className="hv-spacer-small" />
        {titulo("HISTORIAL DE MANTENIMIENTO Y SOPORTE TÉCNICO")}
        <table className="hv-events">
          <thead><tr>
            <th className="date">Fecha<br />(dd/mm/aaaa)</th>
            <th className="type">Tipo de Intervención<br />(Mantenimiento Preventivo, Correctivo, Reparación, Actualización, etc.)</th>
            <th className="desc">Descripción Detallada<br />de la Actividad</th>
            <th className="doneby">Realizado Por<br />(Nombre/Empresa)</th>
            <th className="sign">Firma /<br />quien recibe</th>
          </tr></thead>
          <tbody>
            {eventosPagina2.map((e) => <tr key={e.id} className="hv-event-row">
              <td>{fecha(e.fecha)}</td><td>{e.tipo}</td><td>{e.descripcion}</td><td>{e.realizadoPor}</td><td></td>
            </tr>)}
            {filasVacias(Math.max(0, 13 - eventosPagina2.length), 5)}
          </tbody>
        </table>
      </section>

      <section className="hv-page">
        {encabezado(3)}
        <table className="hv-events">
          <tbody>
            {eventosPagina3.map((e) => <tr key={e.id} className="hv-event-row">
              <td className="date">{fecha(e.fecha)}</td><td className="type">{e.tipo}</td><td className="desc">{e.descripcion}</td><td className="doneby">{e.realizadoPor}</td><td className="sign"></td>
            </tr>)}
            {filasVacias(Math.max(0, 8 - eventosPagina3.length), 5)}
          </tbody>
        </table>

        <div className="hv-spacer-small" />
        {titulo("MOVIMIENTOS Y CAMBIOS DE ASIGNACIÓN")}
        <table className="hv-moves">
          <thead><tr>
            <th>Fecha<br />(dd/mm/aaaa)</th>
            <th>Tipo de Movimiento<br />(Asignación Inicial, Cambio de Usuario, Cambio de Ubicación, etc.)</th>
            <th>Usuario Anterior</th>
            <th>Ubicación Anterior</th>
            <th>Nuevo Usuario Asignado</th>
            <th>Nueva Ubicación</th>
          </tr></thead>
          <tbody>
            {movimientosPagina3.map((m) => <tr key={m.id} className="hv-move-row">
              <td>{fecha(m.fecha_movimiento)}</td>
              <td>{m.tipo_movimiento === "ASIGNACION" ? "Asignación Inicial" : m.tipo_movimiento === "TRASLADO" ? "Cambio de Usuario / Ubicación" : "Devolución"}</td>
              <td>{nombrePersona(m.responsable_origen)}</td>
              <td>{m.dependencia_origen?.nombre || ""}</td>
              <td>{nombrePersona(m.responsable_destino)}</td>
              <td>{m.dependencia_destino?.nombre || ""}</td>
            </tr>)}
            {filasVacias(Math.max(0, 8 - movimientosPagina3.length), 6)}
          </tbody>
        </table>

        <div className="hv-spacer-small" />
        {titulo("INFORMACIÓN DE BAJA (SI APLICA)")}
        <table className="hv-two-col"><tbody>
          {fila("Fecha de Baja:", "", "(dd/mm/aaaa)")}
          {fila("Motivo de la Baja:", "", "(Obsolescencia, Daño irreparable, Pérdida, Robo, etc.)")}
          {fila("Destino Final:", "", "(Ej.: Reciclaje, Donación, Venta, Almacenamiento)")}
          {fila("Número de Acta de Baja:", "", "(Referencia al documento formal de baja)")}
        </tbody></table>
      </section>

      <section className="hv-page">
        {encabezado(4)}
        <table className="hv-two-col"><tbody>
          {fila("Observaciones Adicionales sobre la Baja:", "")}
        </tbody></table>

        <div className="hv-spacer" />
        {titulo("OBSERVACIONES GENERALES")}
        <p style={{ margin: "4mm 7mm", lineHeight: 1.35 }}>
          • (Espacio para cualquier nota adicional relevante sobre el equipo, configuraciones especiales, dependencias, etc.)
        </p>
        <div className="hv-general-box">
          <div style={{ marginBottom: "3mm", fontSize: "9.5pt" }}><strong>Observación registrada:</strong> {activo.observaciones || ""}</div>
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="hv-line" />)}
        </div>
      </section>
    </div>
  );
}
