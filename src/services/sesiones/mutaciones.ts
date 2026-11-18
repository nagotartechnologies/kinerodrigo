import db, { type SentenciaBatch } from '@/lib/db';
import { ErrorNegocio, noEncontrado } from '@/lib/errores';
import { asegurarEpisodio } from '@/lib/episodios';
import type { SesionInput, CompletarSesionInput } from '@/lib/schemas/sesiones';
import { DURACION_POR_DEFECTO } from '@/services/citas/conflictos';

const ESTADO_INICIAL_SESION = 'programada';

// Estados del paciente que impiden agendar y el mensaje para cada uno
const BLOQUEOS_POR_ESTADO: Record<string, string> = {
  alta: 'No se pueden crear sesiones para pacientes dados de alta. Por favor, reactive al paciente primero.',
  abandono: 'No se pueden crear sesiones para pacientes en receso. Por favor, reactive al paciente primero.',
};

async function sesionExistente(id: number) {
  const sesion = await db.prepare('SELECT id, estado, cita_id, fecha, hora FROM sesiones WHERE id = ?').get(id);
  if (!sesion) throw noEncontrado('Sesión no encontrada');
  return sesion;
}

const ejerciciosJson = (ejercicios: unknown[] | null | undefined) => (ejercicios?.length ? JSON.stringify(ejercicios) : null);

function valoresClinicos(datos: CompletarSesionInput) {
  return [
    datos.dolorInicial ?? null,
    datos.dolorFinal ?? null,
    datos.borgPercepcion ?? null,
    datos.movilidad || null,
    datos.fuerza || null,
    datos.progresoGeneral || null,
    ejerciciosJson(datos.ejerciciosRealizados),
    datos.observaciones || null,
    datos.recomendaciones || null,
  ];
}

export async function crearSesion(datos: SesionInput) {
  const paciente = await db.prepare('SELECT id, estado_paciente FROM pacientes WHERE id = ?').get(datos.pacienteId);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
  const bloqueo = BLOQUEOS_POR_ESTADO[String(paciente.estado_paciente)];
  if (bloqueo) throw new ErrorNegocio(bloqueo);

  // Las sesiones se numeran desde 1 dentro del episodio actual
  const episodio = await asegurarEpisodio(datos.pacienteId);
  const episodioId = episodio?.id ?? null;
  const conteo = await db.prepare('SELECT COUNT(*) as total FROM sesiones WHERE episodio_id = ?').get(episodioId);
  const numeroSesion = Number(conteo?.total ?? 0) + 1;
  const duracion = datos.duracion ?? DURACION_POR_DEFECTO;

  // Sin cita previa se crea una 'pendiente' para que aparezca en el calendario y reciba recordatorios
  let citaId = datos.citaId ?? null;
  if (!citaId) {
    const cita = await db.prepare(`
      INSERT INTO citas (paciente_id, fecha, hora, duracion, tipo, estado, notas) VALUES (?, ?, ?, ?, ?, 'pendiente', ?)
    `).run(datos.pacienteId, datos.fecha, datos.hora, duracion, datos.tipo, `Sesión #${numeroSesion} - ${datos.tipo}`);
    citaId = Number(cita.lastInsertRowid);
  }

  const result = await db.prepare(`
    INSERT INTO sesiones (
      paciente_id, episodio_id, cita_id, fecha, hora, duracion, tipo, estado, numero_sesion, notas_sesion, proxima_sesion,
      dolor_inicial, dolor_final, borg_percepcion, movilidad, fuerza, progreso_general, ejercicios_realizados, observaciones, recomendaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    datos.pacienteId, episodioId, citaId, datos.fecha, datos.hora, duracion, datos.tipo,
    datos.estado || ESTADO_INICIAL_SESION, numeroSesion, datos.notasSesion || null, datos.proximaSesion || null,
    ...valoresClinicos(datos)
  );

  return { id: Number(result.lastInsertRowid), episodioId, citaId, numeroSesion, citaCreada: !datos.citaId };
}

export async function actualizarSesion(id: number, datos: SesionInput): Promise<void> {
  const actual = await sesionExistente(id);
  const duracion = datos.duracion ?? DURACION_POR_DEFECTO;
  const estado = datos.estado || ESTADO_INICIAL_SESION;
  // Si el formulario no manda citaId se conserva el vínculo actual
  const citaId = datos.citaId !== undefined ? datos.citaId : actual.cita_id ? Number(actual.cita_id) : null;

  const sentencias: SentenciaBatch[] = [{
    sql: `UPDATE sesiones SET paciente_id = ?, cita_id = ?, fecha = ?, hora = ?, duracion = ?, tipo = ?, estado = ?,
            notas_sesion = ?, proxima_sesion = ?, dolor_inicial = ?, dolor_final = ?, borg_percepcion = ?, movilidad = ?,
            fuerza = ?, progreso_general = ?, ejercicios_realizados = ?, observaciones = ?, recomendaciones = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      datos.pacienteId, citaId, datos.fecha, datos.hora, duracion, datos.tipo, estado,
      datos.notasSesion || null, datos.proximaSesion || null, ...valoresClinicos(datos), id,
    ],
  }];

  // La cita vinculada sigue a la sesión; si cambia el horario su recordatorio deja de servir
  if (citaId) {
    sentencias.push({
      sql: 'UPDATE citas SET fecha = ?, hora = ?, duracion = ?, tipo = ?, estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [datos.fecha, datos.hora, duracion, datos.tipo, estado, citaId],
    });
    if (datos.fecha !== actual.fecha || datos.hora !== actual.hora) {
      sentencias.push({ sql: `UPDATE recordatorios SET estado = 'obsoleto' WHERE cita_id = ? AND estado != 'obsoleto'`, args: [citaId] });
    }
  }
  await db.batch(sentencias);
}

export async function completarSesion(id: number, datos: CompletarSesionInput): Promise<void> {
  const actual = await sesionExistente(id);
  if (actual.estado === 'completada') throw new ErrorNegocio('La sesión ya está completada');

  await db.batch([
    {
      sql: `UPDATE sesiones SET estado = 'completada', dolor_inicial = ?, dolor_final = ?, borg_percepcion = ?, movilidad = ?,
              fuerza = ?, progreso_general = ?, ejercicios_realizados = ?, observaciones = ?, recomendaciones = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [...valoresClinicos(datos), id],
    },
    ...(actual.cita_id ? [{
      sql: `UPDATE citas SET estado = 'completada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [Number(actual.cita_id)],
    }] : []),
  ]);
}

export async function eliminarSesion(id: number): Promise<void> {
  await sesionExistente(id);
  await db.prepare('DELETE FROM sesiones WHERE id = ?').run(id);
}
