import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT - Actualizar gasto
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categoria, descripcion, monto, estado, fechaGasto, metodoPago, notas } = body;

    const existing = await db.prepare('SELECT id FROM gastos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 });
    }

    await db.prepare(`
      UPDATE gastos SET
        categoria = COALESCE(?, categoria),
        descripcion = COALESCE(?, descripcion),
        monto = COALESCE(?, monto),
        estado = COALESCE(?, estado),
        fecha_gasto = COALESCE(?, fecha_gasto),
        metodo_pago = COALESCE(?, metodo_pago),
        notas = COALESCE(?, notas)
      WHERE id = ?
    `).run(
      categoria || null,
      descripcion || null,
      monto || null,
      estado || null,
      fechaGasto || null,
      metodoPago || null,
      notas || null,
      id
    );

    const gasto = await db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);
    return NextResponse.json({ success: true, gasto, message: 'Gasto actualizado' });
  } catch (error: any) {
    console.error('Error al actualizar gasto:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar gasto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar gasto
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.prepare('SELECT id FROM gastos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 });
    }

    await db.prepare('DELETE FROM gastos WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Gasto eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar gasto:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar gasto' },
      { status: 500 }
    );
  }
}
