import db from '@/lib/db';
import { ErrorNegocio } from '@/lib/errores';

// Regla de negocio: el kinesiólogo atiende como máximo 2 pacientes a la vez
export const MAX_CITAS_SIMULTANEAS = 2;
export const DURACION_POR_DEFECTO = 60;
export const MENSAJE_CONFLICTO = `Ya hay ${MAX_CITAS_SIMULTANEAS} citas agendadas en ese horario (máximo permitido)`;

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

interface CitaOcupada {
  id: number;
  fecha: string;
  inicio: number;
  fin: number;
}

// Citas que ocupan horario (no canceladas ni completadas) en un rango de fechas,
// en una sola consulta para poder evaluar muchos horarios sin consultar en bucle
export async function citasOcupadas(desde: string, hasta: string): Promise<CitaOcupada[]> {
  const filas = await db.prepare(`
    SELECT id, fecha, hora, COALESCE(duracion, ?) AS duracion FROM citas
    WHERE fecha BETWEEN ? AND ? AND estado NOT IN ('cancelada', 'completada')
  `).all(DURACION_POR_DEFECTO, desde, hasta);
  return filas.map((f) => {
    const inicio = horaAMinutos(String(f.hora));
    return { id: Number(f.id), fecha: String(f.fecha), inicio, fin: inicio + Number(f.duracion) };
  });
}

// Dos rangos se solapan si: inicio1 < fin2 AND inicio2 < fin1
export function hayConflicto(ocupadas: CitaOcupada[], fecha: string, hora: string, duracion: number, excluirId?: number): boolean {
  const inicio = horaAMinutos(hora);
  const fin = inicio + duracion;
  const solapadas = ocupadas.filter((c) => c.fecha === fecha && c.id !== excluirId && c.inicio < fin && inicio < c.fin);
  return solapadas.length >= MAX_CITAS_SIMULTANEAS;
}

export async function verificarDisponibilidad(fecha: string, hora: string, duracion: number, excluirId?: number): Promise<void> {
  const ocupadas = await citasOcupadas(fecha, fecha);
  if (hayConflicto(ocupadas, fecha, hora, duracion, excluirId)) {
    throw new ErrorNegocio(MENSAJE_CONFLICTO, 409);
  }
}
