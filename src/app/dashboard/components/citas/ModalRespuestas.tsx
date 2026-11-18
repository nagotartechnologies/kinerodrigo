'use client';

import { fechaCortaCita } from './formato';
import { IconoCerrar } from './iconos';

export interface RespuestaPendiente {
  id: number;
  citaId: number;
  respuesta: string;
  tardia: boolean;
  fecha: string;
  hora: string;
  paciente: string;
}

interface Props {
  respuestas: RespuestaPendiente[];
  onCerrar: () => void;
  onVerCita: (citaId: number) => void;
  onMarcarRevisadas: (ids: number[]) => void;
}

// Cancelaciones y pedidos de reagendar que llegaron por WhatsApp y nadie ha revisado
export default function ModalRespuestas({ respuestas, onCerrar, onVerCita, onMarcarRevisadas }: Props) {
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content modal-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-respuestas" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="titulo-respuestas">Respuestas de pacientes</h3>
          <button type="button" className="modal-close" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>
        <div className="modal-body">
          {respuestas.length === 0 ? (
            <p className="modal-texto">No hay cancelaciones ni pedidos de reagendar pendientes.</p>
          ) : (
            <div className="respuestas-lista">
              {respuestas.map(r => (
                <div key={r.id} className={`respuesta-item respuesta-item--${r.respuesta === 'CANCELAR' ? 'cancelar' : 'reagendar'}`}>
                  <div className="respuesta-item__info">
                    <div className="respuesta-item__paciente">{r.paciente}</div>
                    <div className="respuesta-item__meta">
                      {r.respuesta === 'CANCELAR' ? '❌ Canceló' : '📅 Quiere reagendar'}
                      {r.tardia && <span className="respuesta-item__tardia">Cancelación tardía</span>}
                    </div>
                    <div className="respuesta-item__meta">{fechaCortaCita(r.fecha, r.hora)}</div>
                  </div>
                  <div className="respuesta-item__acciones" data-no-swipe>
                    <button type="button" className="accion-btn accion-btn--editar" onClick={() => onVerCita(r.citaId)}>
                      Ver cita
                    </button>
                    <button type="button" className="accion-btn accion-btn--confirmar" onClick={() => onMarcarRevisadas([r.id])}>
                      ✓ Revisado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {respuestas.length > 1 && (
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => onMarcarRevisadas(respuestas.map(r => r.id))}>
              Marcar todas como revisadas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
