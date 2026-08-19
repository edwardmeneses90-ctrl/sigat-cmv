import { forwardRef } from "react";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fechaLarga(fecha) {
  if (!fecha) return "";

  const [y, m, d] = String(fecha).slice(0, 10).split("-").map(Number);

  if (!y || !m || !d) return fecha;

  return `Villavicencio, ${d} de ${MESES[m - 1]} de ${y}`;
}

function BloqueTexto({ titulo, texto }) {
  return (
    <section className="concepto-seccion">
      <h2>{titulo}</h2>
      <div className="concepto-parrafo">
        {texto ? texto.split("\n").map((linea, index) => (
          <p key={index}>{linea || "\u00A0"}</p>
        )) : <p>&nbsp;</p>}
      </div>
    </section>
  );
}

const ConceptoBajaImprimible = forwardRef(function ConceptoBajaImprimible(
  { concepto },
  ref,
) {
  if (!concepto) return null;

  return (
    <article ref={ref} className="concepto-print">
      <style>{`
        .concepto-print {
          width: 100%;
          background: #fff;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11.5pt;
          line-height: 1.22;
        }

        .concepto-documento {
          width: 100%;
        }

        .concepto-logo-line {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          min-height: 25mm;
        }

        .concepto-logo {
          width: 63mm;
          height: auto;
          object-fit: contain;
        }

        .concepto-fecha {
          margin-top: 2mm;
          margin-bottom: 12mm;
        }

        .concepto-destinatario {
          margin-bottom: 7mm;
        }

        .concepto-destinatario p,
        .concepto-ref,
        .concepto-saludo,
        .concepto-parrafo p {
          margin: 0;
        }

        .concepto-ref {
          margin-top: 7mm;
        }

        .concepto-saludo {
          margin-top: 7mm;
          margin-bottom: 9mm;
        }

        .concepto-seccion {
          margin-top: 7mm;
        }

        .concepto-seccion h2 {
          margin: 0 0 6mm 8mm;
          font-size: 11.5pt;
          font-weight: 700;
          text-transform: uppercase;
        }

        .concepto-lista {
          margin: 0 0 0 8mm;
          padding-left: 6mm;
        }

        .concepto-lista li {
          margin: 0.7mm 0;
        }

        .concepto-parrafo {
          text-align: justify;
          white-space: pre-wrap;
        }

        .concepto-parrafo p {
          margin: 0 0 3mm 0;
        }

        .concepto-firma {
          margin-top: 9mm;
        }

        .concepto-firma p {
          margin: 0;
        }

        .concepto-page-break {
          break-before: page;
          page-break-before: always;
          height: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .concepto-print,
          .concepto-print * {
            visibility: visible !important;
          }

          .concepto-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          @page {
            size: A4 portrait;
            margin: 17mm 18mm 18mm 18mm;
          }
        }
      `}</style>

      <div className="concepto-documento">
        <div className="concepto-logo-line">
          <img
            src="/logo-concejo-concepto.png"
            alt="Concejo Municipal de Villavicencio"
            className="concepto-logo"
          />
        </div>

        <p className="concepto-fecha">{fechaLarga(concepto.fecha)}</p>

        <div className="concepto-destinatario">
          <p>Señora</p>
          <p><strong>{concepto.destinatario_nombre}</strong></p>
          <p>{concepto.destinatario_oficina}</p>
          <p>{concepto.destinatario_entidad}</p>
          <p>Ciudad. -</p>
        </div>

        <p className="concepto-ref">
          <strong>Ref:</strong> {concepto.referencia}
        </p>

        <p className="concepto-saludo">Cordial saludo</p>

        <section className="concepto-seccion">
          <h2>1. INFORMACIÓN GENERAL DEL ELEMENTO</h2>

          <ul className="concepto-lista">
            <li><strong>Tipo de equipo:</strong> {concepto.tipo_equipo || "—"}</li>
            <li><strong>Asignado a:</strong> {concepto.asignado_a || "—"}</li>
            <li><strong>Dependencia:</strong> {concepto.dependencia || "—"}</li>
            <li><strong>Placa de Inventario / Activo Fijo:</strong> {concepto.placa_inventario}</li>
            <li>
              <strong>Marca / Modelo:</strong>{" "}
              {[concepto.marca, concepto.modelo].filter(Boolean).join(" – ") || "—"}
            </li>
            <li><strong>Número de Serie:</strong> {concepto.numero_serie || "—"}</li>
          </ul>
        </section>

        <BloqueTexto
          titulo="2. ANTECEDENTES Y DESCRIPCIÓN DE LA FALLA"
          texto={concepto.antecedentes_descripcion_falla}
        />

        <BloqueTexto
          titulo="3. INSPECCIÓN TÉCNICA Y MANTENIMIENTO CORRECTIVO EJECUTADO"
          texto={concepto.inspeccion_mantenimiento_correctivo}
        />

        <div className="concepto-page-break" />

        <div className="concepto-logo-line">
          <img
            src="/logo-concejo-concepto.png"
            alt="Concejo Municipal de Villavicencio"
            className="concepto-logo"
          />
        </div>

        <BloqueTexto
          titulo="5. DIAGNÓSTICO FINALES Y CONCLUSIONES"
          texto={concepto.diagnostico_conclusiones}
        />

        <BloqueTexto
          titulo="6. RECOMENDACIÓN Y CONCEPTO"
          texto={concepto.recomendacion_concepto}
        />

        {concepto.nota_seguridad_informacion && (
          <div className="concepto-parrafo" style={{ marginTop: "6mm" }}>
            <p>
              <strong>Nota de Seguridad de la Información:</strong>{" "}
              {concepto.nota_seguridad_informacion}
            </p>
          </div>
        )}

        <div className="concepto-firma">
          <p>Cordialmente,</p>

          <div style={{ height: "16mm" }} />

          <p><strong>{concepto.tecnico_nombre}</strong></p>
          {concepto.tecnico_cargo && <p>{concepto.tecnico_cargo}</p>}
          {concepto.tecnico_area && <p>{concepto.tecnico_area}</p>}
          {concepto.tecnico_telefono && <p>Cel {concepto.tecnico_telefono}</p>}
          {concepto.tecnico_correo && <p>{concepto.tecnico_correo}</p>}
        </div>
      </div>
    </article>
  );
});

export default ConceptoBajaImprimible;
