'use client';

import { etiquetaRecordatorio } from './formato';

export interface AccionesCita {
  onConfirmar: (id: number) => void;
  onRecordatorio: (cita: any) => void;
  onCrearSesion: (cita: any) => void;
  onPago: (cita: any) => void;
  onEditar: (cita: any) => void;
}

interface Props extends AccionesCita {
  cita: any;
  hoyStr: string;
}

// Solo las citas de hoy pueden estar en curso o ya pasadas
function estadoTemporal(cita: any, hoyStr: string) {
  if (cita.fecha !== hoyStr) return { enCurso: false, pasada: false };
  const ahora = new Date();
  const [h, m] = cita.hora.split(':').map(Number);
  const inicio = new Date();
  inicio.setHours(h, m, 0, 0);
  const fin = new Date(inicio.getTime() + (Number(cita.duracion) || 0) * 60000);
  return { enCurso: ahora >= inicio && ahora <= fin, pasada: ahora > fin };
}

// Tarjeta de cita con acciones rápidas (vista Hoy y lista del día en la vista Mes)
export default function AgendaCard({ cita, hoyStr, onConfirmar, onRecordatorio, onCrearSesion, onPago, onEditar }: Props) {
  const { enCurso, pasada } = estadoTemporal(cita, hoyStr);
  const activa = cita.estado !== 'cancelada' && cita.estado !== 'completada';

  return (
    <div className={`agenda-card agenda-card--${cita.estado} ${enCurso ? 'is-en-curso' : ''} ${pasada ? 'is-pasada' : ''}`}>
      <div className="agenda-card__top">
        <div className="agenda-card__hora">{cita.hora}</div>
        <div className="agenda-card__info">
          <div className="agenda-card__paciente">{cita.paciente}</div>
          <div className="agenda-card__meta">
            <span>{cita.tipo} · {cita.duracion} min</span>
            {cita.recordatorio && <span>{etiquetaRecordatorio(cita.recordatorio)}</span>}
            {enCurso && <span className="agenda-card__en-curso">En curso</span>}
          </div>
        </div>
        <span className={`estado-pill estado-pill--${cita.estado}`}>{cita.estado}</span>
      </div>

      {activa && (
        <div className="agenda-card__acciones" data-no-swipe>
          {cita.estado === 'pendiente' && (
            <button type="button" className="accion-btn accion-btn--confirmar" onClick={() => onConfirmar(cita.id)}>
              ✓ Confirmar
            </button>
          )}
          {(!cita.recordatorio || cita.recordatorio.estado === 'error') && cita.telefono && (
            <button type="button" className="accion-btn accion-btn--whatsapp" onClick={() => onRecordatorio(cita)}>
              📱 WhatsApp
            </button>
          )}
          {!cita.tieneSesion && (
            <button type="button" className="accion-btn accion-btn--sesion" onClick={() => onCrearSesion(cita)}>
              + Sesión
            </button>
          )}
          <button type="button" className="accion-btn accion-btn--pago" onClick={() => onPago(cita)}>
            $ Pago
          </button>
          <button type="button" className="accion-btn accion-btn--editar" onClick={() => onEditar(cita)}>
            ✏️ Editar
          </button>
        </div>
      )}

      {cita.tieneSesion && (
        <div className="agenda-card__nota agenda-card__nota--sesion">
          <svg viewBox="0 0 24 24" fill="none" className="icono-14" aria-hidden="true">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Sesión registrada ({cita.sesionEstado})
        </div>
      )}
      {cita.notas && <div className="agenda-card__nota agenda-card__nota--texto">{cita.notas}</div>}
    </div>
  );
}
