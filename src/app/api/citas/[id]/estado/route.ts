import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PATCH - Cambiar el estado de una cita
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { estado } = body;

    // Validar estado
    const estadosValidos = ['pendiente', 'confirmada', 'completada', 'cancelada'];
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Verificar que la cita existe
    const cita = await db.prepare('SELECT id FROM citas WHERE id = ?').get(id);
    if (!cita) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar el estado
    await db.prepare(`
      UPDATE citas 
      SET estado = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(estado, id);

    // Obtener la cita actualizada
    const citaActualizada: any = await db.prepare(`
      SELECT 
        c.id,
        c.paciente_id,
        c.fecha,
        c.hora,
        c.duracion,
        c.tipo,
        c.estado,
        c.notas,
        c.created_at,
        c.updated_at,
        p.nombre as paciente_nombre,
        p.rut as paciente_rut,
        p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(id);

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      cita: {
        id: citaActualizada.id,
        pacienteId: citaActualizada.paciente_id,
        paciente: citaActualizada.paciente_nombre,
        rut: citaActualizada.paciente_rut,
        telefono: citaActualizada.paciente_telefono,
        fecha: citaActualizada.fecha,
        hora: citaActualizada.hora,
        duracion: citaActualizada.duracion,
        tipo: citaActualizada.tipo,
        estado: citaActualizada.estado,
        notas: citaActualizada.notas,
        createdAt: citaActualizada.created_at,
        updatedAt: citaActualizada.updated_at
      }
    });

  } catch (error: any) {
    console.error('Error al cambiar estado:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cambiar el estado' },
      { status: 500 }
    );
  }
}
