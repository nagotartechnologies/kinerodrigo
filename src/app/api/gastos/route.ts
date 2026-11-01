import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener gastos con filtros
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let query = 'SELECT * FROM gastos WHERE 1=1';
    const params: any[] = [];

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }
    if (fechaDesde) {
      query += ' AND fecha_gasto >= ?';
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND fecha_gasto <= ?';
      params.push(fechaHasta);
    }

    query += ' ORDER BY fecha_gasto DESC, created_at DESC';

    const gastos = await db.prepare(query).all(...params);

    return NextResponse.json({ success: true, gastos });
  } catch (error: any) {
    console.error('Error al obtener gastos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener gastos' },
      { status: 500 }
    );
  }
}

// POST - Crear un gasto
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await request.json();
    const { categoria, descripcion, monto, estado, fechaGasto, metodoPago, notas, gastoFijoId } = body;

    if (!categoria || !descripcion || !monto || !fechaGasto) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos (categoria, descripcion, monto, fechaGasto)' },
        { status: 400 }
      );
    }

    if (monto <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const result = await db.prepare(`
      INSERT INTO gastos (categoria, descripcion, monto, estado, fecha_gasto, metodo_pago, notas, gasto_fijo_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      categoria,
      descripcion,
      monto,
      estado || 'pendiente',
      fechaGasto,
      metodoPago || null,
      notas || null,
      gastoFijoId || null
    );

    const gasto = await db.prepare('SELECT * FROM gastos WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ success: true, gasto, message: 'Gasto registrado exitosamente' });
  } catch (error: any) {
    console.error('Error al crear gasto:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear gasto' },
      { status: 500 }
    );
  }
}
