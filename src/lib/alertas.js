const MS_DIA = 1000 * 60 * 60 * 24;

export function fechaLocal(valor) {
  if (!valor) return null;

  const texto = String(valor);
  const soloFecha = texto.slice(0, 10);
  const fecha = new Date(`${soloFecha}T12:00:00`);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function sumarAnios(valor, anios) {
  const fecha = fechaLocal(valor);
  if (!fecha) return null;

  const resultado = new Date(fecha);
  resultado.setFullYear(resultado.getFullYear() + anios);
  return resultado;
}

export function diasHasta(fechaDestino) {
  if (!fechaDestino) return null;

  const hoy = new Date();
  const inicioHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    12,
    0,
    0,
  );

  const destino = new Date(
    fechaDestino.getFullYear(),
    fechaDestino.getMonth(),
    fechaDestino.getDate(),
    12,
    0,
    0,
  );

  return Math.ceil((destino.getTime() - inicioHoy.getTime()) / MS_DIA);
}

export function formatearFechaCorta(fecha) {
  if (!fecha) return "—";

  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function textoVencimiento(dias) {
  if (dias === null) return "—";
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Faltan ${dias} días`;
}

function nivelPorDias(dias, preventivo = 30) {
  if (dias < 0) return "ROJO";
  if (dias <= 7) return "ROJO";
  if (dias <= 15) return "AMARILLO";
  if (dias <= preventivo) return "AZUL";
  return null;
}

function alertaFecha({
  id,
  activo,
  categoria,
  titulo,
  fecha,
  preventivo,
  detalle,
}) {
  const dias = diasHasta(fecha);
  const nivel = nivelPorDias(dias, preventivo);

  if (!nivel) return null;

  return {
    id,
    activoId: activo.id,
    placa: activo.codigo || "—",
    equipo:
      activo.nombre_equipo ||
      activo.tipos_activo?.nombre ||
      "Equipo",
    dependencia:
      activo.dependencias?.nombre || "Sin dependencia",
    categoria,
    titulo,
    fecha,
    dias,
    nivel,
    detalle,
  };
}

export function construirAlertas({
  activos = [],
  mantenimientos = [],
  novedades = [],
}) {
  const alertas = [];

  activos.forEach((activo) => {
    if (activo.estado === "DADO_DE_BAJA") {
      return;
    }

    if (activo.fecha_inicio_licencia_antivirus) {
      const vencimiento = sumarAnios(
        activo.fecha_inicio_licencia_antivirus,
        1,
      );

      const alerta = alertaFecha({
        id: `antivirus-${activo.id}`,
        activo,
        categoria: "Antivirus",
        titulo: "Licencia de antivirus",
        fecha: vencimiento,
        preventivo: 30,
        detalle: "Cumplimiento de un año desde el inicio de la licencia.",
      });

      if (alerta) alertas.push(alerta);
    }

    if (activo.fecha_ultimo_mantenimiento) {
      const vencimiento = sumarAnios(
        activo.fecha_ultimo_mantenimiento,
        1,
      );

      const alerta = alertaFecha({
        id: `mantenimiento-anual-${activo.id}`,
        activo,
        categoria: "Mantenimiento",
        titulo: "Mantenimiento anual",
        fecha: vencimiento,
        preventivo: 30,
        detalle: "El equipo se acerca a un año desde su último mantenimiento.",
      });

      if (alerta) alertas.push(alerta);
    }

    if (activo.fecha_fin_garantia) {
      const fechaGarantia = fechaLocal(activo.fecha_fin_garantia);

      const alerta = alertaFecha({
        id: `garantia-${activo.id}`,
        activo,
        categoria: "Garantía",
        titulo: "Garantía del equipo",
        fecha: fechaGarantia,
        preventivo: 60,
        detalle: "La garantía del activo está próxima a vencer o ya venció.",
      });

      if (alerta) alertas.push(alerta);
    }

    if (activo.estado === "PENDIENTE_BAJA") {
      alertas.push({
        id: `baja-${activo.id}`,
        activoId: activo.id,
        placa: activo.codigo || "—",
        equipo:
          activo.nombre_equipo ||
          activo.tipos_activo?.nombre ||
          "Equipo",
        dependencia:
          activo.dependencias?.nombre || "Sin dependencia",
        categoria: "Baja",
        titulo: "Equipo pendiente de baja",
        fecha: null,
        dias: null,
        nivel: "ROJO",
        detalle: "El activo está marcado como PENDIENTE_BAJA.",
      });
    }

    if (activo.estado === "ASIGNADO" && !activo.responsable_id) {
      alertas.push({
        id: `sin-responsable-${activo.id}`,
        activoId: activo.id,
        placa: activo.codigo || "—",
        equipo:
          activo.nombre_equipo ||
          activo.tipos_activo?.nombre ||
          "Equipo",
        dependencia:
          activo.dependencias?.nombre || "Sin dependencia",
        categoria: "Inventario",
        titulo: "Activo asignado sin responsable",
        fecha: null,
        dias: null,
        nivel: "ROJO",
        detalle: "El estado es ASIGNADO pero no tiene funcionario responsable.",
      });
    }

    if (activo.estado === "ASIGNADO" && !activo.dependencia_id) {
      alertas.push({
        id: `sin-dependencia-${activo.id}`,
        activoId: activo.id,
        placa: activo.codigo || "—",
        equipo:
          activo.nombre_equipo ||
          activo.tipos_activo?.nombre ||
          "Equipo",
        dependencia: "Sin dependencia",
        categoria: "Inventario",
        titulo: "Activo asignado sin dependencia",
        fecha: null,
        dias: null,
        nivel: "ROJO",
        detalle: "El estado es ASIGNADO pero no tiene dependencia registrada.",
      });
    }
  });

  // Usa únicamente el mantenimiento más reciente de cada activo
  // que tenga próximo mantenimiento programado.
  const proximoPorActivo = new Map();

  [...mantenimientos]
    .filter((item) => item.proximo_mantenimiento)
    .sort((a, b) => {
      const fa = fechaLocal(a.fecha_mantenimiento)?.getTime() || 0;
      const fb = fechaLocal(b.fecha_mantenimiento)?.getTime() || 0;
      return fb - fa;
    })
    .forEach((item) => {
      if (!proximoPorActivo.has(item.activo_id)) {
        proximoPorActivo.set(item.activo_id, item);
      }
    });

  proximoPorActivo.forEach((item) => {
    const activo = item.activos;
    if (!activo || activo.estado === "DADO_DE_BAJA") return;

    const alerta = alertaFecha({
      id: `proximo-mantenimiento-${item.id}`,
      activo,
      categoria: "Mantenimiento",
      titulo: "Próximo mantenimiento programado",
      fecha: fechaLocal(item.proximo_mantenimiento),
      preventivo: 30,
      detalle:
        item.tipo === "CORRECTIVO"
          ? "Seguimiento programado después de mantenimiento correctivo."
          : "Mantenimiento preventivo programado.",
    });

    if (alerta) alertas.push(alerta);
  });

  const tiposCriticos = new Set([
    "FALLA",
    "DANO",
    "GARANTIA",
    "PERDIDA",
    "HURTO",
  ]);

  novedades.forEach((item) => {
    if (!tiposCriticos.has(item.tipo)) return;

    const fecha = fechaLocal(item.fecha_novedad);
    if (!fecha) return;

    const diasTranscurridos = -diasHasta(fecha);
    if (diasTranscurridos < 0 || diasTranscurridos > 30) return;

    const activo = item.activos;
    if (!activo || activo.estado === "DADO_DE_BAJA") return;

    alertas.push({
      id: `novedad-${item.id}`,
      activoId: activo.id,
      placa: activo.codigo || "—",
      equipo:
        activo.nombre_equipo ||
        activo.tipos_activo?.nombre ||
        "Equipo",
      dependencia:
        activo.dependencias?.nombre || "Sin dependencia",
      categoria: "Novedad",
      titulo:
        item.tipo === "DANO"
          ? "Daño reciente"
          : item.tipo === "FALLA"
            ? "Falla reciente"
            : item.tipo === "HURTO"
              ? "Hurto reportado"
              : item.tipo === "PERDIDA"
                ? "Pérdida reportada"
                : "Novedad de garantía",
      fecha,
      dias: null,
      nivel: "ROJO",
      detalle: item.descripcion || "Novedad crítica registrada en los últimos 30 días.",
    });
  });

  const peso = {
    ROJO: 0,
    AMARILLO: 1,
    AZUL: 2,
  };

  return alertas.sort((a, b) => {
    const porNivel = peso[a.nivel] - peso[b.nivel];
    if (porNivel !== 0) return porNivel;

    if (a.fecha && b.fecha) {
      return a.fecha.getTime() - b.fecha.getTime();
    }

    if (a.fecha) return -1;
    if (b.fecha) return 1;

    return a.placa.localeCompare(b.placa);
  });
}

export function resumenAlertas(alertas) {
  return {
    total: alertas.length,
    rojas: alertas.filter((item) => item.nivel === "ROJO").length,
    amarillas: alertas.filter((item) => item.nivel === "AMARILLO").length,
    azules: alertas.filter((item) => item.nivel === "AZUL").length,
  };
}
