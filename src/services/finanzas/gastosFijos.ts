import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import type { CrearGastoFijoInput, ActualizarGastoFijoInput } from '@/lib/schemas/finanzas';

const DIA_GENERACION_POR_DEFECTO = 1;

export async function listarGastosFijos() {
  return db.prepare('SELECT * FROM gastos_fijos ORDER BY categoria, descripcion').all();
}

async function obtenerGastoFijo(id: number) {
  const gastoFijo = await db.prepare('SELECT * FROM gastos_fijos WHERE id = ?').get(id);
  if (!gastoFijo) throw noEncontrado('Gasto fijo no encontrado');
  return gastoFijo;
}

export async function crearGastoFijo(datos: CrearGastoFijoInput) {
  const result = await db.prepare('INSERT INTO gastos_fijos (categoria, descripcion, monto, dia_generacion) VALUES (?, ?, ?, ?)')
    .run(datos.categoria, datos.descripcion, datos.monto, datos.diaGeneracion ?? DIA_GENERACION_POR_DEFECTO);
  return obtenerGastoFijo(Number(result.lastInsertRowid));
}

export async function actualizarGastoFijo(id: number, datos: ActualizarGastoFijoInput) {
  await obtenerGastoFijo(id);
  const update = sentenciaUpdate('gastos_fijos', {
    categoria: datos.categoria,
    descripcion: datos.descripcion,
    monto: datos.monto,
    activo: datos.activo === undefined ? undefined : datos.activo ? 1 : 0,
    dia_generacion: datos.diaGeneracion,
  }, id, { conTimestamp: false });
  if (update) await db.prepare(update.sql).run(...(update.args ?? []));
  return obtenerGastoFijo(id);
}

export async function eliminarGastoFijo(id: number): Promise<void> {
  await obtenerGastoFijo(id);
  await db.prepare('DELETE FROM gastos_fijos WHERE id = ?').run(id);
}

// Un gasto fijo del día 31 cae el último día en meses más cortos
function fechaEnMes(mes: string, dia: number): string {
  const [anio, numeroMes] = mes.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
  return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

// Genera los gastos del mes de los fijos activos que aún no lo tengan: 2 lecturas y 1 escritura atómica
export async function generarGastosDelMes(mes: string) {
  const fijos = await db.prepare('SELECT * FROM gastos_fijos WHERE activo = 1').all();
  const existentes = await db
    .prepare('SELECT DISTINCT gasto_fijo_id FROM gastos WHERE gasto_fijo_id IS NOT NULL AND fecha_gasto LIKE ?')
    .all(`${mes}%`);
  const yaGenerados = new Set(existentes.map((fila) => Number(fila.gasto_fijo_id)));
  const pendientes = fijos.filter((gf) => !yaGenerados.has(Number(gf.id)));

  if (pendientes.length) {
    await db.batch(pendientes.map((gf) => ({
      sql: `INSERT INTO gastos (categoria, descripcion, monto, estado, fecha_gasto, gasto_fijo_id) VALUES (?, ?, ?, 'pendiente', ?, ?)`,
      args: [gf.categoria, gf.descripcion, gf.monto, fechaEnMes(mes, Number(gf.dia_generacion) || DIA_GENERACION_POR_DEFECTO), gf.id],
    })));
  }
  return { generados: pendientes.length, yaExisten: fijos.length - pendientes.length, total: fijos.length };
}
