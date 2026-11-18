import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { ErrorNegocio, noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import type { CrearUsuarioInput, ActualizarUsuarioInput } from '@/lib/schemas/usuarios';

const COLUMNAS_PUBLICAS = 'id, nombre, apellido, email, activo, created_at as createdAt';

export async function listarUsuarios() {
  return db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY created_at DESC`).all();
}

async function obtenerUsuario(id: number) {
  const usuario = await db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(id);
  if (!usuario) throw noEncontrado('Usuario no encontrado');
  return usuario;
}

async function verificarEmailLibre(email: string, excluirId?: number): Promise<void> {
  const existente = await db
    .prepare('SELECT id FROM usuarios WHERE lower(email) = lower(?) AND id != ?')
    .get(email, excluirId ?? 0);
  if (existente) throw new ErrorNegocio('El email ya está registrado');
}

// Impide dejar el sistema sin nadie que pueda entrar
async function verificarQuedaOtroActivo(id: number, usuarioActualId: number, accion: string): Promise<void> {
  if (id === usuarioActualId) throw new ErrorNegocio(`No puedes ${accion} tu propio usuario`);
  const fila = await db.prepare('SELECT COUNT(*) as total FROM usuarios WHERE activo = 1 AND id != ?').get(id);
  if (Number(fila?.total ?? 0) === 0) throw new ErrorNegocio('Debe quedar al menos un usuario activo');
}

export async function crearUsuario(datos: CrearUsuarioInput) {
  await verificarEmailLibre(datos.email);
  const result = await db
    .prepare(`INSERT INTO usuarios (nombre, apellido, email, password, activo, created_at) VALUES (?, ?, ?, ?, 1, datetime('now'))`)
    .run(datos.nombre, datos.apellido, datos.email, hashPassword(datos.password));
  return { id: Number(result.lastInsertRowid), nombre: datos.nombre, apellido: datos.apellido, email: datos.email, activo: 1 };
}

export async function actualizarUsuario(id: number, datos: ActualizarUsuarioInput, usuarioActualId: number) {
  if (datos.email !== undefined) await verificarEmailLibre(datos.email, id);
  if (datos.activo !== undefined && !datos.activo) await verificarQuedaOtroActivo(id, usuarioActualId, 'desactivar');

  const update = sentenciaUpdate('usuarios', {
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    password: datos.password ? hashPassword(datos.password) : undefined,
    activo: datos.activo === undefined ? undefined : datos.activo ? 1 : 0,
  }, id);
  if (!update) throw new ErrorNegocio('No hay cambios para actualizar');

  await db.prepare(update.sql).run(...(update.args ?? []));
  return obtenerUsuario(id);
}

export async function eliminarUsuario(id: number, usuarioActualId: number): Promise<void> {
  await obtenerUsuario(id);
  await verificarQuedaOtroActivo(id, usuarioActualId, 'eliminar');
  await db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
}
