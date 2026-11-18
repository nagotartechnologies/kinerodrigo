import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';

type Fila = Record<string, unknown>;

// Últimas 8 semanas si no se pide un rango: evita traer todo el historial
const DIAS_HISTORIAL_POR_DEFECTO = 56;

const SELECT_CITA = `
  SELECT c.id, c.paciente_id, c.fecha, c.hora, c.duracion, c.tipo, c.estado, c.notas,
    c.created_at, c.updated_at,
    p.nombre as paciente_nombre, p.rut as paciente_rut, p.telefono as paciente_telefono
  FROM citas c
  LEFT JOIN pacientes p ON c.paciente_id = p.id`;

export function formatearCita(cita: Fila) {
  return {
    id: cita.id,
    pacienteId: cita.paciente_id,
    paciente: cita.paciente_nombre,
    rut: cita.paciente_rut,
    telefono: cita.paciente_telefono,
    fecha: cita.fecha,
    hora: cita.hora,
    duracion: cita.duracion,
    tipo: cita.tipo,
    estado: cita.estado,
    notas: cita.notas,
    createdAt: cita.created_at,
    updatedAt: cita.updated_at,
  };
}

export async function obtenerCita(id: number) {
  const cita = await db.prepare(`${SELECT_CITA} WHERE c.id = ?`).get(id);
  if (!cita) throw noEncontrado('Cita no encontrada');
  return formatearCita(cita);
}

export interface FiltrosCitas {
  fecha?: string | null;
  pacienteId?: string | null;
  estado?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  sinFiltro?: string | null;
}

function fechaHaceDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function construirFiltros(filtros: FiltrosCitas): { where: string; params: (string | number)[] } {
  const condiciones: string[] = [];
  const params: (string | number)[] = [];
  const agregar = (sql: string, valor: string | number) => {
    condiciones.push(sql);
    params.push(valor);
  };

  if (filtros.fecha) agregar('c.fecha = ?', filtros.fecha);
  if (filtros.pacienteId) agregar('c.paciente_id = ?', Number(filtros.pacienteId));
  if (filtros.estado) agregar('c.estado = ?', filtros.estado);
  if (filtros.fechaDesde) agregar('c.fecha >= ?', filtros.fechaDesde);
  if (filtros.fechaHasta) agregar('c.fecha <= ?', filtros.fechaHasta);
  if (!filtros.fecha && !filtros.fechaDesde && !filtros.fechaHasta && !filtros.sinFiltro) {
    agregar('c.fecha >= ?', fechaHaceDias(DIAS_HISTORIAL_POR_DEFECTO));
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', params };
}

// Una sola consulta con JOINs: paciente, sesión vinculada y último recordatorio vigente
export async function listarCitas(filtros: FiltrosCitas) {
  const { where, params } = construirFiltros(filtros);
  const filas = await db.prepare(`
    SELECT c.id, c.paciente_id, c.fecha, c.hora, c.duracion, c.tipo, c.estado, c.notas,
      c.created_at, c.updated_at,
      p.nombre as paciente_nombre, p.rut as paciente_rut, p.telefono as paciente_telefono,
      s.id as sesion_id, s.estado as sesion_estado, s.progreso_general as sesion_progreso,
      r.id as recordatorio_id, r.estado as recordatorio_estado, r.respuesta as recordatorio_respuesta,
      r.enviado_at as recordatorio_enviado_at, r.cancelacion_tardia as recordatorio_cancelacion_tardia
    FROM citas c
    LEFT JOIN pacientes p ON c.paciente_id = p.id
    LEFT JOIN sesiones s ON s.cita_id = c.id
    LEFT JOIN (
      SELECT cita_id, id, estado, respuesta, enviado_at, cancelacion_tardia
      FROM recordatorios
      WHERE id IN (SELECT MAX(id) FROM recordatorios WHERE estado != 'obsoleto' GROUP BY cita_id)
    ) r ON r.cita_id = c.id
    ${where}
    ORDER BY c.fecha DESC, c.hora DESC
  `).all(...params);

  return filas.map((cita) => ({
    ...formatearCita(cita),
    tieneSesion: !!cita.sesion_id,
    sesionId: cita.sesion_id || null,
    sesionEstado: cita.sesion_estado || null,
    sesionProgreso: cita.sesion_progreso || null,
    tienePago: false,
    totalPagado: 0,
    cantidadPagos: 0,
    recordatorio: cita.recordatorio_id ? {
      id: cita.recordatorio_id,
      estado: cita.recordatorio_estado,
      respuesta: cita.recordatorio_respuesta,
      enviadoAt: cita.recordatorio_enviado_at,
      cancelacionTardia: !!cita.recordatorio_cancelacion_tardia,
    } : null,
  }));
}
