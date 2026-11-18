import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { getEpisodioActual, asegurarEpisodio, mapearEstadoPacienteAEpisodio } from '@/lib/episodios';

const ESTADO_POR_DEFECTO = 'activo';

async function pacienteConEstado(id: number) {
  const paciente = await db.prepare('SELECT id, nombre, estado_paciente FROM pacientes WHERE id = ? AND activo = 1').get(id);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
  return { ...paciente, estado: String(paciente.estado_paciente || ESTADO_POR_DEFECTO) };
}

interface CambioEstado {
  estado: string;
  motivo?: string | null;
  notas?: string | null;
}

export async function cambiarEstadoPaciente(id: number, { estado, motivo, notas }: CambioEstado) {
  const paciente = await pacienteConEstado(id);
  const estadoAnterior = paciente.estado;
  if (estadoAnterior === estado) {
    return { cambiado: false, estadoAnterior, paciente: { ...paciente, estado_paciente: estado } };
  }

  await asegurarEpisodio(id);
  const episodioActual = await getEpisodioActual(id);
  // alta => cerrar episodio; activo/receso => mantener abierto
  const fechaCierre = estado === 'alta' ? new Date().toISOString() : null;

  await db.batch([
    { sql: 'UPDATE pacientes SET estado_paciente = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [estado, id] },
    ...(episodioActual ? [{
      sql: 'UPDATE episodios SET estado = ?, fecha_cierre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [mapearEstadoPacienteAEpisodio(estado), fechaCierre, episodioActual.id],
    }] : []),
    {
      sql: 'INSERT INTO historial_estados_paciente (paciente_id, estado_anterior, estado_nuevo, motivo, notas) VALUES (?, ?, ?, ?, ?)',
      args: [id, estadoAnterior, estado, motivo || null, notas || null],
    },
  ]);

  const actualizado = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
  return { cambiado: true, estadoAnterior, paciente: actualizado };
}

export async function historialEstados(id: number) {
  const paciente = await pacienteConEstado(id);
  const historial = await db.prepare(`
    SELECT id, estado_anterior, estado_nuevo, motivo, notas, created_at
    FROM historial_estados_paciente WHERE paciente_id = ? ORDER BY created_at DESC
  `).all(id);

  return {
    paciente: { id: paciente.id, nombre: paciente.nombre, estadoActual: paciente.estado },
    historial: historial.map((h) => ({
      id: h.id,
      estadoAnterior: h.estado_anterior,
      estadoNuevo: h.estado_nuevo,
      motivo: h.motivo,
      notas: h.notas,
      fecha: h.created_at,
    })),
  };
}
