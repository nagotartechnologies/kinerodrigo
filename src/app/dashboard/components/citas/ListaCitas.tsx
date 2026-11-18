'use client';

import { parsearFechaCita, ETIQUETA_ESTADO_CITA } from './formato';

interface Props {
  citas: any[];
  onCambiarEstado: (id: number) => void;
  onEditar: (cita: any) => void;
  onEliminar: (id: number) => void;
}

// Vista "Lista": todas las citas cargadas con acciones de estado, edición y borrado
export default function ListaCitas({ citas, onCambiarEstado, onEditar, onEliminar }: Props) {
  return (
    <div className="citas-lista">
      {citas.length === 0 ? (
        <p className="empty-state">No hay citas programadas</p>
      ) : (
        <div className="lista-grid">
          {citas.map(cita => {
            const fechaCita = parsearFechaCita(cita.fecha);
            return (
              <div key={cita.id} className={`cita-lista-item ${cita.estado}`}>
                <div className="cita-lista-fecha">
                  <div className="fecha-dia">{fechaCita.toLocaleDateString('es-CL', { day: 'numeric' })}</div>
                  <div className="fecha-mes">{fechaCita.toLocaleDateString('es-CL', { month: 'short' })}</div>
                </div>
                <div className="cita-lista-info">
                  <h4>{cita.paciente}</h4>
                  <div className="cita-lista-detalles">
                    <span className="detalle-item">
                      <svg viewBox="0 0 24 24" fill="none" className="icono-16" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {cita.hora} ({cita.duracion} min)
                    </span>
                    <span className="detalle-item">
                      <svg viewBox="0 0 24 24" fill="none" className="icono-16" aria-hidden="true">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {cita.tipo}
                    </span>
                  </div>
                </div>
                <div className="cita-lista-acciones">
                  <button
                    type="button"
                    className={`estado-badge ${cita.estado}`}
                    onClick={() => onCambiarEstado(cita.id)}
                    title="Toca para cambiar estado"
                  >
                    {ETIQUETA_ESTADO_CITA[cita.estado] ?? 'Pendiente'}
                  </button>
                  <button type="button" className="btn-icon" onClick={() => onEditar(cita)} title="Editar cita" aria-label="Editar cita">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  <button type="button" className="btn-icon delete" onClick={() => onEliminar(cita.id)} title="Eliminar cita" aria-label="Eliminar cita">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
