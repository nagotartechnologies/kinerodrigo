import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT - Actualizar gasto fijo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categoria, descripcion, monto, activo, diaGeneracion } = body;

    const existing = await db.prepare('SELECT id FROM gastos_fijos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gasto fijo no encontrado' }, { status: 404 });
    }

    await db.prepare(`
      UPDATE gastos_fijos SET
        categoria = COALESCE(?, categoria),
        descripcion = COALESCE(?, descripcion),
        monto = COALESCE(?, monto),
        activo = COALESCE(?, activo),
        dia_generacion = COALESCE(?, dia_generacion)
      WHERE id = ?
    `).run(
      categoria ?? null,
      descripcion ?? null,
      monto ?? null,
      activo ?? null,
      diaGeneracion ?? null,
      id
    );

    const gastoFijo = await db.prepare('SELECT * FROM gastos_fijos WHERE id = ?').get(id);
    return NextResponse.json({ success: true, gastoFijo, message: 'Gasto fijo actualizado' });
  } catch (error: any) {
    console.error('Error al actualizar gasto fijo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar gasto fijo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar gasto fijo
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.prepare('SELECT id FROM gastos_fijos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gasto fijo no encontrado' }, { status: 404 });
    }

    await db.prepare('DELETE FROM gastos_fijos WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Gasto fijo eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar gasto fijo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar gasto fijo' },
      { status: 500 }
    );
  }
}
