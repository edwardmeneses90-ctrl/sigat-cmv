import { forwardRef } from "react";

const REGISTROS_POR_PAGINA = 14;

function fechaEs(fecha) {
  if (!fecha) return "";

  const valor = String(fecha).slice(0, 10);
  const partes = valor.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return fecha;
}

function dividirEnPaginas(registros) {
  if (!registros.length) return [[]];

  const paginas = [];

  for (let i = 0; i < registros.length; i += REGISTROS_POR_PAGINA) {
    paginas.push(registros.slice(i, i + REGISTROS_POR_PAGINA));
  }

  return paginas;
}

function fechaElaboracion(registros) {
  if (!registros.length) {
    return fechaEs(new Date().toISOString().slice(0, 10));
  }

  const fechas = [...new Set(registros.map((item) => item.fecha).filter(Boolean))];

  if (fechas.length === 1) {
    return fechaEs(fechas[0]);
  }

  return fechaEs(new Date().toISOString().slice(0, 10));
}

function PaginaFormato({
  registros,
  elaboradoPor,
  numeroPagina,
  totalPaginas,
}) {
  const filasVacias = Math.max(0, REGISTROS_POR_PAGINA - registros.length);
  const fechaPie = fechaElaboracion(registros);

  return (
    <section className="for-soporte-page">
      <table className="for-soporte-table">
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "19.5%" }} />
          <col style={{ width: "25.5%" }} />
          <col style={{ width: "12.5%" }} />
          <col style={{ width: "15.5%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>

        <tbody>
          <tr className="header-row">
            <td rowSpan={4} className="logo-cell">
              <img
                src="/logo-concejo-villavicencio.png"
                alt="Concejo Municipal de Villavicencio"
                className="logo-img"
              />
            </td>

            <td colSpan={4} className="titulo-principal">
              CONCEJO MUNICIPAL DE VILLAVICENCIO
            </td>

            <td className="meta-cell">
              <div className="meta-line">
                <strong>Código:</strong>
                <span>FOR-GESTIC-10</span>
              </div>
            </td>
          </tr>

          <tr className="header-row">
            <td colSpan={4} className="titulo-principal">
              PROCESO GESTIÓN DE LAS TIC
            </td>

            <td className="meta-cell">
              <div className="meta-line">
                <strong>Versión:</strong>
                <span>1</span>
              </div>
            </td>
          </tr>

          <tr className="header-row">
            <td colSpan={4} className="titulo-principal">&nbsp;</td>

            <td className="meta-cell">
              <div className="meta-line">
                <strong>Vigencia:</strong>
                <span>05/05/2025</span>
              </div>
            </td>
          </tr>

          <tr className="header-row">
            <td colSpan={4} className="titulo-formato">
              FORMATO DE REGISTRO DE SOPORTE TÉCNICO
            </td>

            <td className="pagina-cell">
              Página {numeroPagina} de {totalPaginas}
            </td>
          </tr>

          <tr className="column-header-row">
            <th>FECHA</th>
            <th>TIPO DE SOPORTE</th>
            <th>ACTIVIDAD REALIZADA</th>
            <th>DEPENDENCIA</th>
            <th>NOMBRE QUIEN REALIZA EL SOPORTE</th>
            <th>FIRMA Y NOMBRE USUARIO SOLICITANTE</th>
          </tr>

          {registros.map((item) => (
            <tr className="support-row" key={item.id}>
              <td>{fechaEs(item.fecha)}</td>
              <td>{item.tipo_soporte || ""}</td>
              <td>{item.actividad_realizada || ""}</td>
              <td>{item.dependencia_nombre || ""}</td>
              <td>{item.tecnico_nombre || ""}</td>
              <td>{item.solicitante_nombre || ""}</td>
            </tr>
          ))}

          {Array.from({ length: filasVacias }).map((_, index) => (
            <tr className="support-row" key={`empty-${index}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}

          <tr className="footer-row">
            <td colSpan={2} className="footer-label">FECHA</td>
            <td colSpan={4} className="footer-value">{fechaPie}</td>
          </tr>

          <tr className="footer-row">
            <td colSpan={2} className="footer-label">NOMBRE</td>
            <td colSpan={4} className="footer-value">{elaboradoPor || ""}</td>
          </tr>

          <tr className="footer-row">
            <td colSpan={2} className="footer-label">CARGO</td>
            <td colSpan={4} className="footer-value">
              Técnico Administrativo de Medios Tecnológicos
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

const SoporteTecnicoImprimible = forwardRef(function SoporteTecnicoImprimible(
  { soportes = [], elaboradoPor = "" },
  ref,
) {
  const registros = soportes.filter((item) => item.anulado !== true);
  const paginas = dividirEnPaginas(registros);

  return (
    <div ref={ref} className="for-soporte-print">
      <style>{`
        .for-soporte-print {
          width: 100%;
          background: #ffffff;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .for-soporte-page {
          width: 100%;
          background: #ffffff;
          box-sizing: border-box;
        }

        .for-soporte-page + .for-soporte-page {
          page-break-before: always;
        }

        .for-soporte-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #000;
          font-size: 8.2px;
        }

        .for-soporte-table td,
        .for-soporte-table th {
          border: 1px solid #000;
          padding: 1.8mm 1.3mm;
          box-sizing: border-box;
          vertical-align: middle;
          color: #000;
          background: #fff;
        }

        .header-row {
          height: 6.1mm;
        }

        .logo-cell {
          padding: 1mm 2mm !important;
          text-align: center;
          vertical-align: middle !important;
        }

        .logo-img {
          display: block;
          width: 100%;
          max-width: 68mm;
          max-height: 23mm;
          object-fit: contain;
          margin: 0 auto;
        }

        .titulo-principal,
        .titulo-formato {
          text-align: center;
          font-weight: 700;
          line-height: 1.1;
          padding: 1mm !important;
        }

        .titulo-principal {
          font-size: 8.5px;
        }

        .titulo-formato {
          font-size: 8.2px;
        }

        .meta-cell,
        .pagina-cell {
          padding: 0 !important;
          font-size: 7.8px;
        }

        .meta-line {
          display: grid;
          grid-template-columns: 45% 55%;
          align-items: center;
          width: 100%;
          min-height: 6mm;
        }

        .meta-line strong {
          text-align: right;
          padding-right: 1.3mm;
        }

        .meta-line span {
          text-align: left;
          padding-left: 1mm;
        }

        .pagina-cell {
          text-align: center;
        }

        .column-header-row {
          height: 17mm;
        }

        .column-header-row th {
          text-align: center;
          font-size: 7.7px;
          font-weight: 700;
          line-height: 1.1;
          padding: 1.3mm;
        }

        .support-row {
          height: 10.6mm;
        }

        .support-row td {
          font-size: 7.6px;
          line-height: 1.15;
          text-align: left;
          overflow-wrap: anywhere;
          padding: 1.1mm 1.3mm;
        }

        .support-row td:first-child {
          text-align: center;
          white-space: nowrap;
        }

        .footer-row {
          height: 7.5mm;
        }

        .footer-label {
          text-align: center;
          font-size: 8px;
        }

        .footer-value {
          text-align: left;
          font-size: 8px;
          padding-left: 3mm !important;
        }

        @media print {
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .for-soporte-print,
          .for-soporte-print * {
            visibility: visible !important;
          }

          .for-soporte-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          .for-soporte-page {
            page-break-after: always;
            break-after: page;
          }

          .for-soporte-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      {paginas.map((pagina, index) => (
        <PaginaFormato
          key={`pagina-${index}`}
          registros={pagina}
          elaboradoPor={elaboradoPor}
          numeroPagina={index + 1}
          totalPaginas={paginas.length}
        />
      ))}
    </div>
  );
});

export default SoporteTecnicoImprimible;
