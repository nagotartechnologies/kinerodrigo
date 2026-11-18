import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import type { CrearGastoInput, ActualizarGastoInput } from '@/lib/schemas/finanzas';

const ESTADO_GASTO_POR_DEFECTO = 'pendiente';

export interface FiltrosGastos {
  categoria?: string | null;
  estado?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function listarGastos(filtros: FiltrosGastos) {
  const condiciones: string[] = [];
  const params: string[] = [];
  if (filtros.categoria) { condiciones.push('categoria = ?'); params.push(filtros.categoria); }
  if (filtros.estado) { condiciones.push('estado = ?'); params.push(filtros.estado); }
  if (filtros.fechaDesde) { condiciones.push('fecha_gasto >= ?'); params.push(filtros.fechaDesde); }
  if (filtros.fechaHasta) { condiciones.push('fecha_gasto <= ?'); params.push(filtros.fechaHasta); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM gastos ${where} ORDER BY fecha_gasto DESC, created_at DESC`).all(...params);
}

async function obtenerGasto(id: number) {
  const gasto = await db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);
  if (!gasto) throw noEncontrado('Gasto no encontrado');
  return gasto;
}

export async function crearGasto(datos: CrearGastoInput) {
  const result = await db.prepare(`
    INSERT INTO gastos (categoria, descripcion, monto, estado, fecha_gasto, metodo_pago, notas, gasto_fijo_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    datos.categoria, datos.descripcion, datos.monto, datos.estado || ESTADO_GASTO_POR_DEFECTO,
    datos.fechaGasto, datos.metodoPago || null, datos.notas || null, datos.gastoFijoId ?? null
  );
  return obtenerGasto(Number(result.lastInsertRowid));
}

export async function actualizarGasto(id: number, datos: ActualizarGastoInput) {
  await obtenerGasto(id);
  const update = sentenciaUpdate('gastos', {
    categoria: datos.categoria,
    descripcion: datos.descripcion,
    monto: datos.monto,
    estado: datos.estado,
    fecha_gasto: datos.fechaGasto,
    metodo_pago: datos.metodoPago,
    notas: datos.notas,
  }, id, { conTimestamp: false });
  if (update) await db.prepare(update.sql).run(...(update.args ?? []));
  return obtenerGasto(id);
}

export async function eliminarGasto(id: number): Promise<void> {
  await obtenerGasto(id);
  await db.prepare('DELETE FROM gastos WHERE id = ?').run(id);
}
