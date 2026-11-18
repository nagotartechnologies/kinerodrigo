import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { getEpisodioActual, asegurarEpisodio, mapearEstadoEpisodioAPaciente } from '@/lib/episodios';
import type { CrearEpisodioInput, ActualizarEpisodioInput } from '@/lib/schemas/pacientes';

async function verificarPacienteActivo(id: number): Promise<void> {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND activo = 1').get(id);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
}

export async function listarEpisodios(pacienteId: number) {
  await verificarPacienteActivo(pacienteId);
  // Migración perezosa: pacientes antiguos reciben su Episodio 1 al consultarse
  const episodioActual = await asegurarEpisodio(pacienteId);
  const episodios = await db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id) as total_sesiones,
      (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id AND s.estado = 'completada') as sesiones_completadas
    FROM episodios e WHERE e.paciente_id = ? ORDER BY e.numero_episodio DESC
  `).all(pacienteId);
  return { episodios, episodioActualId: episodioActual?.id || null };
}

// Cierra el episodio actual (si sigue abierto) y abre el siguiente, en una sola operación atómica
export async function crearEpisodio(pacienteId: number, datos: CrearEpisodioInput) {
  await verificarPacienteActivo(pacienteId);
  const actual = await asegurarEpisodio(pacienteId);
  const siguienteNumero = Number(actual?.numero_episodio || 0) + 1;
  const ahora = new Date().toISOString();
  const motivo = datos.motivoLesion ?? null;
  const objetivo = datos.objetivo ?? null;
  const evaluacion = datos.evaluacionFisica ?? null;

  const cerrarActual = actual && actual.estado !== 'alta';
  const resultados = await db.batch([
    ...(cerrarActual ? [{
      sql: `UPDATE episodios SET estado = 'alta', fecha_cierre = COALESCE(fecha_cierre, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [ahora, actual.id],
    }] : []),
    {
      sql: `INSERT INTO episodios (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica, estado, fecha_inicio)
            VALUES (?, ?, ?, ?, ?, 'en_tratamiento', ?)`,
      args: [pacienteId, siguienteNumero, motivo, objetivo, evaluacion, ahora],
    },
    // Los campos clínicos del paciente reflejan el episodio actual (compatibilidad UI)
    {
      sql: `UPDATE pacientes SET lesion_consulta = ?, objetivo_paciente = ?, evaluacion_fisica = ?,
              evaluacion_final = NULL, estado_paciente = 'activo', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [motivo, objetivo, evaluacion, pacienteId],
    },
    {
      sql: `INSERT INTO historial_estados_paciente (paciente_id, estado_anterior, estado_nuevo, motivo, notas) VALUES (?, ?, 'activo', ?, ?)`,
      args: [pacienteId, mapearEstadoEpisodioAPaciente(actual?.estado), 'Nuevo episodio', motivo],
    },
  ]);

  const nuevoId = Number(resultados[cerrarActual ? 1 : 0].lastInsertRowid);
  const episodio = await db.prepare('SELECT * FROM episodios WHERE id = ?').get(nuevoId);
  return { numero: siguienteNumero, episodio };
}

export async function actualizarEpisodio(pacienteId: number, episodioId: number, datos: ActualizarEpisodioInput) {
  const episodio = await db.prepare('SELECT * FROM episodios WHERE id = ? AND paciente_id = ?').get(episodioId, pacienteId);
  if (!episodio) throw noEncontrado('Episodio no encontrado');

  const valores = [
    datos.motivoLesion !== undefined ? datos.motivoLesion : episodio.motivo_lesion,
    datos.objetivo !== undefined ? datos.objetivo : episodio.objetivo,
    datos.evaluacionFisica !== undefined ? datos.evaluacionFisica : episodio.evaluacion_fisica,
    datos.evaluacionFinal !== undefined ? datos.evaluacionFinal : episodio.evaluacion_final,
  ];

  const actual = await getEpisodioActual(pacienteId);
  const esActual = actual && Number(actual.id) === episodioId;
  await db.batch([
    {
      sql: `UPDATE episodios SET motivo_lesion = ?, objetivo = ?, evaluacion_fisica = ?, evaluacion_final = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...valores, episodioId],
    },
    // Si es el episodio actual, la ficha del paciente se sincroniza (compatibilidad UI)
    ...(esActual ? [{
      sql: `UPDATE pacientes SET lesion_consulta = ?, objetivo_paciente = ?, evaluacion_fisica = ?, evaluacion_final = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...valores, pacienteId],
    }] : []),
  ]);

  return db.prepare('SELECT * FROM episodios WHERE id = ?').get(episodioId);
}
