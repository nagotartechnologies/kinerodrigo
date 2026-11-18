import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import { getEpisodioActual } from '@/lib/episodios';
import { COLUMNAS_PACIENTE, type CamposPaciente } from '@/lib/schemas/pacientes';

// Al crear se guardan los datos de la ficha inicial; el resto se completa después
const COLUMNAS_CREACION = COLUMNAS_PACIENTE.filter(
  (columna) => !['sesiones_programadas', 'evaluacion_final', 'estado_tratamiento'].includes(columna)
);
// Si llegan vacíos se conserva el valor previo: el dato vive también en el episodio
const COLUMNAS_QUE_NO_SE_VACIAN: (keyof CamposPaciente)[] = ['lesion_consulta', 'objetivo_paciente', 'estado_tratamiento'];

export async function listarPacientes() {
  return db.prepare('SELECT * FROM pacientes WHERE activo = 1 ORDER BY created_at DESC').all();
}

export async function obtenerPaciente(id: number) {
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND activo = 1').get(id);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
  return paciente;
}

export async function crearPaciente(datos: CamposPaciente) {
  const valores = COLUMNAS_CREACION.map((columna) => datos[columna] ?? null);
  const placeholders = COLUMNAS_CREACION.map(() => '?').join(', ');
  const result = await db
    .prepare(`INSERT INTO pacientes (${COLUMNAS_CREACION.join(', ')}) VALUES (${placeholders})`)
    .run(...valores);
  const pacienteId = Number(result.lastInsertRowid);

  // Todo paciente nace con su Episodio 1 y los datos clínicos iniciales
  await db.prepare(`
    INSERT INTO episodios (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica, estado, fecha_inicio)
    VALUES (?, 1, ?, ?, ?, 'en_tratamiento', ?)
  `).run(pacienteId, datos.lesion_consulta ?? null, datos.objetivo_paciente ?? null, datos.evaluacion_fisica ?? null, new Date().toISOString());

  return db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId);
}

// Actualización parcial: solo se tocan las columnas que vienen en el body
export async function actualizarPaciente(id: number, datos: CamposPaciente) {
  await obtenerPaciente(id);
  const campos = Object.fromEntries(COLUMNAS_PACIENTE.map((columna) => {
    const valor = datos[columna];
    const conservar = valor === null && COLUMNAS_QUE_NO_SE_VACIAN.includes(columna);
    return [columna, conservar ? undefined : valor];
  }));

  const update = sentenciaUpdate('pacientes', campos, id);
  if (update) await db.prepare(update.sql).run(...(update.args ?? []));

  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
  // El episodio actual es la fuente de verdad clínica: se mantiene sincronizado
  const episodioActual = await getEpisodioActual(id);
  if (episodioActual && paciente) {
    await db.prepare(`
      UPDATE episodios SET motivo_lesion = ?, objetivo = ?, evaluacion_fisica = ?, evaluacion_final = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(paciente.lesion_consulta ?? null, paciente.objetivo_paciente ?? null, paciente.evaluacion_fisica ?? null, paciente.evaluacion_final ?? null, episodioActual.id);
  }
  return paciente;
}

// Borra en una sola operación atómica todo lo asociado; el paciente queda con baja lógica
export async function eliminarPaciente(id: number): Promise<void> {
  await obtenerPaciente(id);
  await db.batch([
    { sql: 'DELETE FROM recordatorios WHERE cita_id IN (SELECT id FROM citas WHERE paciente_id = ?)', args: [id] },
    { sql: 'DELETE FROM pagos WHERE paciente_id = ?', args: [id] },
    { sql: 'DELETE FROM sesiones WHERE paciente_id = ?', args: [id] },
    { sql: 'DELETE FROM citas WHERE paciente_id = ?', args: [id] },
    { sql: 'UPDATE pacientes SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [id] },
  ]);
}
