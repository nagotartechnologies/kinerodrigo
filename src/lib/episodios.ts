import db from '@/lib/db';

// Convierte el estado que maneja la UI del paciente al formato que usa la tabla episodios
export function mapearEstadoPacienteAEpisodio(estadoPaciente: string | null): string {
  switch (estadoPaciente) {
    case 'alta':
      return 'alta';
    case 'abandono':
      return 'receso';
    case 'activo':
    default:
      return 'en_tratamiento';
  }
}

// Convierte el estado del episodio de vuelta al formato que espera la UI.
// Necesario para mantener compatibilidad con el campo estado_paciente en la tabla pacientes.
export function mapearEstadoEpisodioAPaciente(estadoEpisodio: string | null): string {
  switch (estadoEpisodio) {
    case 'alta':
      return 'alta';
    case 'receso':
      return 'abandono';
    case 'en_tratamiento':
    default:
      return 'activo';
  }
}

// Devuelve el episodio mas reciente de un paciente segun numero_episodio.
// Retorna null si el paciente aun no tiene episodios registrados.
export async function getEpisodioActual(pacienteId: number | string): Promise<any | null> {
  const episodio: any = await db.prepare(
    `SELECT * FROM episodios
     WHERE paciente_id = ?
     ORDER BY numero_episodio DESC
     LIMIT 1`
  ).get(pacienteId);
  return episodio || null;
}

// Garantiza que el paciente tenga al menos un episodio antes de continuar.
// Si el paciente fue creado antes del sistema de episodios (sin migrar),
// genera el Episodio 1 con sus datos clinicos actuales y le reasigna las sesiones huerfanas.
// Despues de esto siempre devuelve un episodio valido.
export async function asegurarEpisodio(pacienteId: number | string): Promise<any> {
  const existente = await getEpisodioActual(pacienteId);
  if (existente) return existente;

  const paciente: any = await db.prepare(
    'SELECT * FROM pacientes WHERE id = ?'
  ).get(pacienteId);

  if (!paciente) {
    throw new Error('Paciente no encontrado al asegurar episodio');
  }

  const estadoEpisodio = mapearEstadoPacienteAEpisodio(paciente.estado_paciente);
  const fechaCierre = estadoEpisodio === 'alta' ? new Date().toISOString() : null;

  const result: any = await db.prepare(`
    INSERT INTO episodios
      (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica,
       evaluacion_final, estado, fecha_inicio, fecha_cierre)
    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pacienteId,
    paciente.lesion_consulta || paciente.motivo_consulta || null,
    paciente.objetivo_paciente || null,
    paciente.evaluacion_fisica || null,
    paciente.evaluacion_final || null,
    estadoEpisodio,
    paciente.created_at || new Date().toISOString(),
    fechaCierre
  );

  const episodioId = Number(result.lastInsertRowid);

  // Las sesiones antiguas que no tienen episodio asignado se vinculan a este Episodio 1
  await db.prepare(
    'UPDATE sesiones SET episodio_id = ? WHERE paciente_id = ? AND episodio_id IS NULL'
  ).run(episodioId, pacienteId);

  return getEpisodioActual(pacienteId);
}
