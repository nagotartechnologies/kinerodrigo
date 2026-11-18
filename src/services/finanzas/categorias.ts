import db from '@/lib/db';
import { ErrorNegocio } from '@/lib/errores';

const COLOR_CATEGORIA_POR_DEFECTO = '#6b7280';

export async function listarCategorias() {
  return db.prepare('SELECT * FROM categorias_gastos ORDER BY nombre').all();
}

export async function crearCategoria(nombre: string, color?: string) {
  const existente = await db.prepare('SELECT id FROM categorias_gastos WHERE lower(nombre) = lower(?)').get(nombre);
  if (existente) throw new ErrorNegocio('Ya existe una categoria con ese nombre');
  const result = await db.prepare('INSERT INTO categorias_gastos (nombre, color) VALUES (?, ?)')
    .run(nombre, color || COLOR_CATEGORIA_POR_DEFECTO);
  return db.prepare('SELECT * FROM categorias_gastos WHERE id = ?').get(Number(result.lastInsertRowid));
}
