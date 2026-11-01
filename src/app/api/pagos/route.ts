import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener todos los pagos
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let query = `
      SELECT 
        p.*,
        pac.nombre as paciente_nombre,
        pac.rut as paciente_rut,
        s.tipo as sesion_tipo
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      LEFT JOIN sesiones s ON p.sesion_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (pacienteId) {
      query += ' AND p.paciente_id = ?';
      params.push(pacienteId);
    }

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }

    if (fechaDesde) {
      query += ' AND p.fecha_pago >= ?';
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ' AND p.fecha_pago <= ?';
      params.push(fechaHasta);
    }

    query += ' ORDER BY p.fecha_pago DESC, p.created_at DESC';

    const pagos = await db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      pagos
    });
  } catch (error: any) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo pago
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await request.json();
    const {
      pacienteId,
      sesionId,
      monto,
      metodoPago,
      estado,
      fechaPago,
      concepto,
      notas,
      numeroFactura
    } = body;

    // Validaciones
    if (!pacienteId || !monto || !metodoPago || !fechaPago) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (monto <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que el paciente existe
    const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Si hay sesión, verificar que existe
    if (sesionId) {
      const sesion = await db.prepare('SELECT id FROM sesiones WHERE id = ?').get(sesionId);
      if (!sesion) {
        return NextResponse.json(
          { success: false, error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }
    }

    const result = await db.prepare(`
      INSERT INTO pagos (
        paciente_id, sesion_id, monto, metodo_pago, estado,
        fecha_pago, concepto, notas, numero_factura
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pacienteId,
      sesionId || null,
      monto,
      metodoPago,
      estado || 'completado',
      fechaPago,
      concepto || null,
      notas || null,
      numeroFactura || null
    );

    const pago = await db.prepare(`
      SELECT 
        p.*,
        pac.nombre as paciente_nombre,
        pac.rut as paciente_rut
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      pago,
      message: 'Pago registrado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al crear pago:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear pago' },
      { status: 500 }
    );
  }
}
