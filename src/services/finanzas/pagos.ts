import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { sentenciaUpdate } from '@/lib/sql';
import type { CrearPagoInput, ActualizarPagoInput } from '@/lib/schemas/finanzas';

const ESTADO_PAGO_POR_DEFECTO = 'completado';

const SELECT_PAGO = `
  SELECT p.*, pac.nombre as paciente_nombre, pac.rut as paciente_rut, pac.telefono as paciente_telefono,
    s.tipo as sesion_tipo, s.fecha as sesion_fecha
  FROM pagos p
  INNER JOIN pacientes pac ON p.paciente_id = pac.id
  LEFT JOIN sesiones s ON p.sesion_id = s.id`;

export interface FiltrosPagos {
  pacienteId?: string | null;
  estado?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export async function listarPagos(filtros: FiltrosPagos) {
  const condiciones: string[] = [];
  const params: (string | number)[] = [];
  if (filtros.pacienteId) { condiciones.push('p.paciente_id = ?'); params.push(Number(filtros.pacienteId)); }
  if (filtros.estado) { condiciones.push('p.estado = ?'); params.push(filtros.estado); }
  if (filtros.fechaDesde) { condiciones.push('p.fecha_pago >= ?'); params.push(filtros.fechaDesde); }
  if (filtros.fechaHasta) { condiciones.push('p.fecha_pago <= ?'); params.push(filtros.fechaHasta); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`${SELECT_PAGO} ${where} ORDER BY p.fecha_pago DESC, p.created_at DESC`).all(...params);
}

export async function obtenerPago(id: number) {
  const pago = await db.prepare(`${SELECT_PAGO} WHERE p.id = ?`).get(id);
  if (!pago) throw noEncontrado('Pago no encontrado');
  return pago;
}

export async function crearPago(datos: CrearPagoInput) {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ?').get(datos.pacienteId);
  if (!paciente) throw noEncontrado('Paciente no encontrado');
  if (datos.sesionId) {
    const sesion = await db.prepare('SELECT id FROM sesiones WHERE id = ?').get(datos.sesionId);
    if (!sesion) throw noEncontrado('Sesión no encontrada');
  }

  const result = await db.prepare(`
    INSERT INTO pagos (paciente_id, sesion_id, monto, metodo_pago, estado, fecha_pago, concepto, notas, numero_factura)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    datos.pacienteId, datos.sesionId ?? null, datos.monto, datos.metodoPago, datos.estado || ESTADO_PAGO_POR_DEFECTO,
    datos.fechaPago, datos.concepto || null, datos.notas || null, datos.numeroFactura || null
  );
  return obtenerPago(Number(result.lastInsertRowid));
}

export async function actualizarPago(id: number, datos: ActualizarPagoInput) {
  await obtenerPago(id);
  const update = sentenciaUpdate('pagos', {
    monto: datos.monto,
    metodo_pago: datos.metodoPago,
    estado: datos.estado,
    fecha_pago: datos.fechaPago,
    concepto: datos.concepto,
    notas: datos.notas,
    numero_factura: datos.numeroFactura,
  }, id);
  if (update) await db.prepare(update.sql).run(...(update.args ?? []));
  return obtenerPago(id);
}

export async function eliminarPago(id: number): Promise<void> {
  await obtenerPago(id);
  await db.prepare('DELETE FROM pagos WHERE id = ?').run(id);
}
