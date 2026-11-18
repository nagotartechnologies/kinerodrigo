import db from '@/lib/db';
import { ErrorNegocio, noEncontrado } from '@/lib/errores';
import type { HorarioBloqueadoInput, EjercicioInput } from '@/lib/schemas/configuracion';

const MOTIVO_BLOQUEO_POR_DEFECTO = 'Bloqueado';
const TIPO_BLOQUEO_POR_DEFECTO = 'bloqueo';

export async function listarHorariosBloqueados(fecha?: string | null) {
  return fecha
    ? db.prepare('SELECT * FROM horarios_bloqueados WHERE fecha = ? ORDER BY fecha, hora_inicio').all(fecha)
    : db.prepare('SELECT * FROM horarios_bloqueados ORDER BY fecha, hora_inicio').all();
}

export async function crearHorarioBloqueado(datos: HorarioBloqueadoInput) {
  const result = await db.prepare('INSERT INTO horarios_bloqueados (fecha, hora_inicio, hora_fin, motivo, tipo) VALUES (?, ?, ?, ?, ?)')
    .run(datos.fecha, datos.hora_inicio, datos.hora_fin, datos.motivo || MOTIVO_BLOQUEO_POR_DEFECTO, datos.tipo || TIPO_BLOQUEO_POR_DEFECTO);
  return db.prepare('SELECT * FROM horarios_bloqueados WHERE id = ?').get(Number(result.lastInsertRowid));
}

export async function listarEjercicios() {
  return db.prepare('SELECT id, nombre, descripcion, categoria, created_at FROM ejercicios ORDER BY nombre ASC').all();
}

async function verificarNombreLibre(nombre: string, excluirId = 0): Promise<void> {
  const existente = await db.prepare('SELECT id FROM ejercicios WHERE LOWER(nombre) = LOWER(?) AND id != ?').get(nombre, excluirId);
  if (existente) throw new ErrorNegocio(excluirId ? 'Ya existe otro ejercicio con ese nombre' : 'Ya existe un ejercicio con ese nombre');
}

export async function crearEjercicio(datos: EjercicioInput) {
  await verificarNombreLibre(datos.nombre);
  const descripcion = datos.descripcion || null;
  const categoria = datos.categoria || null;
  const result = await db.prepare('INSERT INTO ejercicios (nombre, descripcion, categoria) VALUES (?, ?, ?)')
    .run(datos.nombre, descripcion, categoria);
  return { id: Number(result.lastInsertRowid), nombre: datos.nombre, descripcion, categoria };
}

export async function actualizarEjercicio(id: number, datos: EjercicioInput): Promise<void> {
  const ejercicio = await db.prepare('SELECT id FROM ejercicios WHERE id = ?').get(id);
  if (!ejercicio) throw noEncontrado('Ejercicio no encontrado');
  await verificarNombreLibre(datos.nombre, id);
  await db.prepare('UPDATE ejercicios SET nombre = ?, descripcion = ?, categoria = ? WHERE id = ?')
    .run(datos.nombre, datos.descripcion || null, datos.categoria || null, id);
}

export async function eliminarEjercicio(id: number): Promise<void> {
  await db.prepare('DELETE FROM ejercicios WHERE id = ?').run(id);
}
