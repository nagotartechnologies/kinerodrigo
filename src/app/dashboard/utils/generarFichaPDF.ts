import { formatearFechaLocal } from '../utils';

interface GenerarFichaPDFParams {
  paciente: any;
  sesiones: any[];
  logoUrl: string;
  nombreCentro: string;
}

export function generarFichaPDF({ paciente, sesiones, logoUrl, nombreCentro }: GenerarFichaPDFParams) {
  // Ordenar sesiones por fecha ASC (más antigua primero = Sesión #1)
  sesiones = [...sesiones].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  const contenidoPDF = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ficha Paciente - ${paciente.nombre}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #1e293b;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #10b981;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
        }
        .titulo {
          text-align: center;
          color: #1e293b;
          margin: 20px 0;
        }
        .seccion {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        .seccion-titulo {
          background: #10b981;
          color: white;
          padding: 10px 15px;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        .campo {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .campo-label {
          font-weight: bold;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
        }
        .campo-valor {
          color: #1e293b;
          margin-top: 5px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          ${logoUrl ? 
            `<img src="${window.location.origin}${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;" />` : 
            nombreCentro
          }
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: #64748b;">Fecha de emision</div>
          <div style="font-weight: bold;">${new Date().toLocaleDateString('es-CL')}</div>
        </div>
      </div>

      <h1 class="titulo">FICHA CLINICA DE PACIENTE</h1>

      <div class="seccion">
        <div class="seccion-titulo">Datos Personales</div>
        <div class="grid-2">
          <div class="campo">
            <div class="campo-label">Nombre Completo</div>
            <div class="campo-valor">${paciente.nombre}</div>
          </div>
          <div class="campo">
            <div class="campo-label">RUT</div>
            <div class="campo-valor">${paciente.rut}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Telefono</div>
            <div class="campo-valor">${paciente.telefono}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Edad</div>
            <div class="campo-valor">${paciente.edad} anos</div>
          </div>
          <div class="campo">
            <div class="campo-label">Altura</div>
            <div class="campo-valor">${paciente.altura} cm</div>
          </div>
          <div class="campo">
            <div class="campo-label">Peso</div>
            <div class="campo-valor">${paciente.peso} kg</div>
          </div>
        </div>
        <div class="campo">
          <div class="campo-label">Ocupacion</div>
          <div class="campo-valor">${paciente.ocupacion || 'No especificado'}</div>
        </div>
      </div>

      <div class="seccion">
        <div class="seccion-titulo">Antecedentes Medicos</div>
        <div class="campo">
          <div class="campo-label">Enfermedades</div>
          <div class="campo-valor">${paciente.enfermedades || 'Ninguna'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Enfermedades Hereditarias</div>
          <div class="campo-valor">${paciente.enfermedades_hereditarias || 'Ninguna'}</div>
        </div>
      </div>

      <div class="seccion">
        <div class="seccion-titulo">Estilo de Vida</div>
        <div class="campo">
          <div class="campo-label">Deportes</div>
          <div class="campo-valor">${paciente.deportes || 'No especificado'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Alimentacion</div>
          <div class="campo-valor">${paciente.alimentacion || 'No especificado'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Consumo de Agua</div>
          <div class="campo-valor">${paciente.consumo_agua || 'No especificado'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Descanso</div>
          <div class="campo-valor">${paciente.descanso || 'No especificado'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Estado Psicologico</div>
          <div class="campo-valor">${paciente.psicologicamente || 'No especificado'}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Digestion</div>
          <div class="campo-valor">${paciente.digestion || 'No especificado'}</div>
        </div>
      </div>

      <div class="seccion">
        <div class="seccion-titulo">Motivo de Consulta</div>
        <div class="campo">
          <div class="campo-label">Lesion por la que consulta</div>
          <div class="campo-valor">${paciente.lesion_consulta}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Objetivo del Paciente</div>
          <div class="campo-valor">${paciente.objetivo_paciente}</div>
        </div>
        <div class="campo">
          <div class="campo-label">Evaluacion Fisica</div>
          <div class="campo-valor">${paciente.evaluacion_fisica || 'No especificado'}</div>
        </div>
      </div>

      <div class="seccion">
        <div class="seccion-titulo">Historial de Sesiones (${sesiones.length})</div>
        ${sesiones.length === 0 ? `
          <div style="text-align: center; padding: 20px; color: #64748b;">
            No hay sesiones registradas para este paciente
          </div>
        ` : `
          ${sesiones.map((sesion: any, index: number) => `
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-weight: bold; color: #1e293b;">
                  Sesion #${index + 1} - ${formatearFechaLocal(sesion.fecha)}
                </div>
                <div style="background: ${
                  sesion.estado === 'completada' ? '#10b981' :
                  sesion.estado === 'programada' ? '#3b82f6' :
                  sesion.estado === 'confirmada' ? '#2AD636' : '#ef4444'
                }; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                  ${sesion.estado}
                </div>
              </div>
              
              <div class="grid-2">
                <div class="campo">
                  <div class="campo-label">Hora</div>
                  <div class="campo-valor">${sesion.hora}</div>
                </div>
                <div class="campo">
                  <div class="campo-label">Duracion</div>
                  <div class="campo-valor">${sesion.duracion} minutos</div>
                </div>
                <div class="campo">
                  <div class="campo-label">Tipo</div>
                  <div class="campo-valor">${sesion.tipo}</div>
                </div>
                ${sesion.progresoGeneral ? `
                  <div class="campo">
                    <div class="campo-label">Progreso General</div>
                    <div class="campo-valor" style="color: #10b981; font-weight: 600; text-transform: capitalize;">
                      ${sesion.progresoGeneral.replace(/_/g, ' ')}
                    </div>
                  </div>
                ` : ''}
              </div>
              
              ${sesion.notasSesion ? `
                <div class="campo">
                  <div class="campo-label">Notas de la Sesion</div>
                  <div class="campo-valor">${sesion.notasSesion}</div>
                </div>
              ` : ''}
              
              ${(sesion.dolorInicial !== null || sesion.dolorFinal !== null) ? `
                <div class="campo">
                  <div class="campo-label">Escala EVA - Dolor</div>
                  <div class="campo-valor">
                    Inicial: <strong>${sesion.dolorInicial}/10</strong> - 
                    Final: <strong>${sesion.dolorFinal}/10</strong>
                    ${sesion.dolorFinal < sesion.dolorInicial ? 
                      '<span style="color: #10b981; margin-left: 10px;">✓ Mejoria</span>' : 
                      sesion.dolorFinal > sesion.dolorInicial ?
                      '<span style="color: #ef4444; margin-left: 10px;">↑ Aumento</span>' :
                      '<span style="color: #64748b; margin-left: 10px;">= Sin cambio</span>'
                    }
                  </div>
                </div>
              ` : ''}
              
              ${sesion.borgPercepcion !== null && sesion.borgPercepcion !== undefined ? `
                <div class="campo">
                  <div class="campo-label">Escala de Borg - Percepcion de Esfuerzo</div>
                  <div class="campo-valor">
                    <strong>${sesion.borgPercepcion}/10</strong>
                    ${sesion.borgPercepcion === 0 ? ' (Reposo)' : 
                      sesion.borgPercepcion <= 2 ? ' (Muy ligero)' :
                      sesion.borgPercepcion === 3 ? ' (Ligero)' :
                      sesion.borgPercepcion <= 5 ? ' (Algo pesado)' :
                      sesion.borgPercepcion <= 7 ? ' (Pesado)' :
                      sesion.borgPercepcion <= 9 ? ' (Muy pesado)' :
                      ' (Extremo)'}
                  </div>
                </div>
              ` : ''}
              
              ${sesion.movilidad || sesion.fuerza ? `
                <div class="grid-2">
                  ${sesion.movilidad ? `
                    <div class="campo">
                      <div class="campo-label">Movilidad</div>
                      <div class="campo-valor" style="text-transform: capitalize;">${sesion.movilidad}</div>
                    </div>
                  ` : ''}
                  ${sesion.fuerza ? `
                    <div class="campo">
                      <div class="campo-label">Escala de Daniels - Fuerza Muscular</div>
                      <div class="campo-valor">
                        <strong>${sesion.fuerza}/5</strong>
                        ${sesion.fuerza == 0 ? ' (Sin contraccion)' :
                          sesion.fuerza == 1 ? ' (Contraccion visible)' :
                          sesion.fuerza == 2 ? ' (Movimiento sin gravedad)' :
                          sesion.fuerza == 3 ? ' (Contra gravedad)' :
                          sesion.fuerza == 4 ? ' (Resistencia moderada)' :
                          sesion.fuerza == 5 ? ' (Fuerza normal)' :
                          ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 ? `
                <div class="campo">
                  <div class="campo-label">Ejercicios Realizados</div>
                  <div class="campo-valor">
                    ${sesion.ejerciciosRealizados.map((ejercicio: any) => {
                      if (typeof ejercicio === 'string') {
                        return `<div style="margin: 5px 0; padding: 8px; background: #f8f8f8; border-left: 3px solid #2AD636; border-radius: 4px;">
                          <strong>${ejercicio}</strong>
                        </div>`;
                      }
                      return `<div style="margin: 5px 0; padding: 10px; background: #f8f8f8; border-left: 3px solid #2AD636; border-radius: 4px;">
                        <div style="font-weight: bold; margin-bottom: 5px; color: #2a2a2a;">${ejercicio.nombre}</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; font-size: 0.85em; color: #666;">
                          ${ejercicio.peso ? `<div><strong>Peso:</strong> ${ejercicio.peso}</div>` : ''}
                          ${ejercicio.repeticiones ? `<div><strong>Repeticiones:</strong> ${ejercicio.repeticiones}</div>` : ''}
                          ${ejercicio.tiempo ? `<div><strong>Tiempo:</strong> ${ejercicio.tiempo}</div>` : ''}
                          ${ejercicio.carga ? `<div><strong>Carga:</strong> ${ejercicio.carga}</div>` : ''}
                        </div>
                        ${ejercicio.notas ? `<div style="margin-top: 5px; font-size: 0.85em; color: #666; font-style: italic;">${ejercicio.notas}</div>` : ''}
                      </div>`;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${sesion.observaciones ? `
                <div class="campo">
                  <div class="campo-label">Observaciones</div>
                  <div class="campo-valor">${sesion.observaciones}</div>
                </div>
              ` : ''}
              
              ${sesion.recomendaciones ? `
                <div class="campo">
                  <div class="campo-label">Recomendaciones</div>
                  <div class="campo-valor">${sesion.recomendaciones}</div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        `}
      </div>

      ${paciente.evaluacion_final ? `
        <div class="seccion" style="margin-top: 30px; border: 2px solid #10b981; background: #f0fdf4;">
          <div class="seccion-titulo" style="background: #10b981; color: white;">
            Evaluacion Final del Tratamiento
          </div>
          <div style="padding: 20px; white-space: pre-wrap; line-height: 1.8; color: #1e293b;">
            ${paciente.evaluacion_final}
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p><strong>${nombreCentro}</strong> - Sistema de Gestion Kinesiologica</p>
        <p>Documento generado el ${new Date().toLocaleString('es-CL')}</p>
        <p style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
          Desarrollado por Thomas Landeros - Nagotar Tech SPA | +56 9 4888 1923
        </p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  if (ventana) {
    ventana.document.write(contenidoPDF);
    ventana.document.close();
    setTimeout(() => {
      ventana.print();
    }, 250);
  }
}
