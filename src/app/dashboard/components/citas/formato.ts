// Formateos de citas compartidos por las vistas del calendario

export interface RecordatorioCita {
  estado: string;
  respuesta?: string | null;
  cancelacionTardia?: boolean;
}

// 'YYYY-MM-DD' -> Date local (new Date('YYYY-MM-DD') desfasa un día por zona horaria)
export const parsearFechaCita = (fecha: string): Date => {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const etiquetaRecordatorio = (recordatorio: RecordatorioCita): string =>
  recordatorio.estado === 'error' ? '⚠️ Error de envío' :
  recordatorio.respuesta === 'CONFIRMAR' ? '✅ Confirmó' :
  recordatorio.respuesta === 'CANCELAR' ? (recordatorio.cancelacionTardia ? '❌ Canceló (tarde)' : '❌ Canceló') :
  recordatorio.respuesta === 'REAGENDAR' ? '📅 Reagendar' : '📤 Enviado';

export const fechaCortaCita = (fecha: string, hora: string): string =>
  `${parsearFechaCita(fecha).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${hora}`;

export const formatearMesAnio = (fecha: Date): string =>
  fecha.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });

export const esHoy = (fecha: Date): boolean => fecha.toDateString() === new Date().toDateString();

export const ETIQUETA_ESTADO_CITA: Record<string, string> = {
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
  pendiente: 'Pendiente',
};
