import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener un pago por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const pago = await db.prepare(`
      SELECT 
        p.*,
        pac.nombre as paciente_nombre,
        pac.rut as paciente_rut,
        pac.telefono as paciente_telefono,
        s.tipo as sesion_tipo,
        s.fecha as sesion_fecha
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      LEFT JOIN sesiones s ON p.sesion_id = s.id
      WHERE p.id = ?
    `).get(id);

    if (!pago) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pago
    });
  } catch (error: any) {
    console.error('Error al obtener pago:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener pago' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un pago
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  const { id } = await params;
  try {
    const body = await request.json();
    const {
      monto,
      metodoPago,
      estado,
      fechaPago,
      concepto,
      notas,
      numeroFactura
    } = body;

    // Verificar que el pago existe
    const pagoExistente = await db.prepare('SELECT id FROM pagos WHERE id = ?').get(id);
    if (!pagoExistente) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Validaciones
    if (monto !== undefined && monto <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Construir query de actualización
    const updates: string[] = [];
    const values: any[] = [];

    if (monto !== undefined) {
      updates.push('monto = ?');
      values.push(monto);
    }
    if (metodoPago) {
      updates.push('metodo_pago = ?');
      values.push(metodoPago);
    }
    if (estado) {
      updates.push('estado = ?');
      values.push(estado);
    }
    if (fechaPago) {
      updates.push('fecha_pago = ?');
      values.push(fechaPago);
    }
    if (concepto !== undefined) {
      updates.push('concepto = ?');
      values.push(concepto);
    }
    if (notas !== undefined) {
      updates.push('notas = ?');
      values.push(notas);
    }
    if (numeroFactura !== undefined) {
      updates.push('numero_factura = ?');
      values.push(numeroFactura);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.prepare(`
      UPDATE pagos 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const pagoActualizado = await db.prepare(`
      SELECT 
        p.*,
        pac.nombre as paciente_nombre,
        pac.rut as paciente_rut
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      WHERE p.id = ?
    `).get(id);

    return NextResponse.json({
      success: true,
      pago: pagoActualizado,
      message: 'Pago actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar pago:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar pago' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un pago
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  const { id } = await params;
  try {
    // Verificar que el pago existe
    const pago = await db.prepare('SELECT id FROM pagos WHERE id = ?').get(id);
    if (!pago) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    await db.prepare('DELETE FROM pagos WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar pago:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar pago' },
      { status: 500 }
    );
  }
}
