import db, { type SentenciaBatch } from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import type { CrearCitaInput, ActualizarCitaInput } from '@/lib/schemas/citas';
import { verificarDisponibilidad, DURACION_POR_DEFECTO } from './conflictos';
import { obtenerCita } from './consultas';

async function verificarPaciente(pacienteId: number): Promise<void> {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ?').get(pacienteId);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
}

async function citaExistente(id: number) {
  const cita = await db.prepare('SELECT id, fecha, hora, duracion, estado FROM citas WHERE id = ?').get(id);
  if (!cita) throw noEncontrado('Cita no encontrada');
  return {
    fecha: String(cita.fecha),
    hora: String(cita.hora),
    duracion: Number(cita.duracion ?? DURACION_POR_DEFECTO),
    estado: String(cita.estado),
  };
}

export async function crearCita(datos: CrearCitaInput) {
  await verificarPaciente(datos.pacienteId);
  const duracion = datos.duracion ?? DURACION_POR_DEFECTO;
  await verificarDisponibilidad(datos.fecha, datos.hora, duracion);
  const result = await db.prepare(`
    INSERT INTO citas (paciente_id, fecha, hora, duracion, tipo, notas, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(datos.pacienteId, datos.fecha, datos.hora, duracion, datos.tipo, datos.notas || null);
  return obtenerCita(Number(result.lastInsertRowid));
}

export async function actualizarCita(id: number, datos: ActualizarCitaInput) {
  const actual = await citaExistente(id);
  const fecha = datos.fecha ?? actual.fecha;
  const hora = datos.hora ?? actual.hora;
  const duracion = datos.duracion ?? actual.duracion;
  const cambioHorario = fecha !== actual.fecha || hora !== actual.hora;

  if (cambioHorario || duracion !== actual.duracion) {
    await verificarDisponibilidad(fecha, hora, duracion, id);
  }

  // Si la cita cambia de día u hora, el recordatorio anterior ya no corresponde:
  // se marca obsoleto para que el cron envíe uno nuevo con la hora actualizada,
  // y una cita confirmada o pendiente de reagendar vuelve a quedar pendiente.
  let estado = datos.estado;
  const sentencias: SentenciaBatch[] = [];
  if (cambioHorario) {
    sentencias.push({ sql: `UPDATE recordatorios SET estado = 'obsoleto' WHERE cita_id = ? AND estado != 'obsoleto'`, args: [id] });
    const estadoActual = estado ?? actual.estado;
    if (estadoActual === 'confirmada' || estadoActual === 'reagendar') estado = 'pendiente';
  }

  const comunes = { fecha: datos.fecha, hora: datos.hora, duracion: datos.duracion, tipo: datos.tipo, estado };
  const updateCita = sentenciaUpdate('citas', { ...comunes, paciente_id: datos.pacienteId, notas: datos.notas }, id);
  if (updateCita) sentencias.push(updateCita);

  // La sesión vinculada se mantiene en el mismo horario y estado que su cita
  const sesion = await db.prepare('SELECT id FROM sesiones WHERE cita_id = ?').get(id);
  const updateSesion = sesion ? sentenciaUpdate('sesiones', comunes, Number(sesion.id)) : null;
  if (updateSesion) sentencias.push(updateSesion);

  if (sentencias.length) await db.batch(sentencias);
  return obtenerCita(id);
}

export async function cambiarEstadoCita(id: number, estado: string) {
  await citaExistente(id);
  await db.prepare('UPDATE citas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(estado, id);
  return obtenerCita(id);
}

export async function eliminarCita(id: number): Promise<void> {
  await citaExistente(id);
  await db.batch([
    { sql: 'DELETE FROM recordatorios WHERE cita_id = ?', args: [id] },
    { sql: 'DELETE FROM sesiones WHERE cita_id = ?', args: [id] },
    { sql: 'DELETE FROM citas WHERE id = ?', args: [id] },
  ]);
}
