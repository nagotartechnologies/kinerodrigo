import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';

type Fila = Record<string, unknown>;

const COLUMNAS_SESION = `s.id, s.paciente_id, s.episodio_id, s.cita_id, s.fecha, s.hora, s.duracion, s.tipo, s.estado,
  s.numero_sesion, s.notas_sesion, s.ejercicios_realizados, s.observaciones, s.dolor_inicial, s.dolor_final,
  s.borg_percepcion, s.movilidad, s.fuerza, s.progreso_general, s.recomendaciones, s.proxima_sesion,
  s.created_at, s.updated_at,
  p.nombre as paciente_nombre, p.rut as paciente_rut, p.telefono as paciente_telefono,
  p.sesiones_programadas, p.evaluacion_final`;

// Un JSON corrupto en una sesión no debe romper el listado completo
function parsearEjercicios(valor: unknown): unknown[] {
  if (typeof valor !== 'string' || !valor) return [];
  try {
    const parseado = JSON.parse(valor);
    return Array.isArray(parseado) ? parseado : [];
  } catch {
    return [];
  }
}

export function formatearSesion(sesion: Fila) {
  return {
    id: sesion.id,
    pacienteId: sesion.paciente_id,
    episodioId: sesion.episodio_id,
    citaId: sesion.cita_id,
    paciente: sesion.paciente_nombre,
    rut: sesion.paciente_rut,
    telefono: sesion.paciente_telefono,
    fecha: sesion.fecha,
    hora: sesion.hora,
    duracion: sesion.duracion,
    tipo: sesion.tipo,
    estado: sesion.estado,
    numeroSesion: sesion.numero_sesion,
    sesionesProgramadas: sesion.sesiones_programadas,
    evaluacionFinal: sesion.evaluacion_final,
    notasSesion: sesion.notas_sesion,
    ejerciciosRealizados: parsearEjercicios(sesion.ejercicios_realizados),
    observaciones: sesion.observaciones,
    dolorInicial: sesion.dolor_inicial,
    dolorFinal: sesion.dolor_final,
    borgPercepcion: sesion.borg_percepcion,
    movilidad: sesion.movilidad,
    fuerza: sesion.fuerza,
    progresoGeneral: sesion.progreso_general,
    recomendaciones: sesion.recomendaciones,
    proximaSesion: sesion.proxima_sesion,
    createdAt: sesion.created_at,
    updatedAt: sesion.updated_at,
  };
}

export interface FiltrosSesiones {
  pacienteId?: string | null;
  estado?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function listarSesiones(filtros: FiltrosSesiones) {
  const condiciones: string[] = [];
  const params: (string | number)[] = [];
  if (filtros.pacienteId) { condiciones.push('s.paciente_id = ?'); params.push(Number(filtros.pacienteId)); }
  if (filtros.estado) { condiciones.push('s.estado = ?'); params.push(filtros.estado); }
  if (filtros.fechaDesde) { condiciones.push('s.fecha >= ?'); params.push(filtros.fechaDesde); }
  if (filtros.fechaHasta) { condiciones.push('s.fecha <= ?'); params.push(filtros.fechaHasta); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const filas = await db.prepare(`
    SELECT ${COLUMNAS_SESION} FROM sesiones s LEFT JOIN pacientes p ON s.paciente_id = p.id
    ${where} ORDER BY s.fecha DESC, s.hora DESC
  `).all(...params);
  return filas.map(formatearSesion);
}

export async function obtenerSesion(id: number) {
  const sesion = await db.prepare(`
    SELECT ${COLUMNAS_SESION} FROM sesiones s LEFT JOIN pacientes p ON s.paciente_id = p.id WHERE s.id = ?
  `).get(id);
  if (!sesion) throw noEncontrado('Sesión no encontrada');
  return formatearSesion(sesion);
}
