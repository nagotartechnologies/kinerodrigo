import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener una cita por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const cita: any = await db.prepare(`
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

    if (!cita) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cita: {
        id: cita.id,
        pacienteId: cita.paciente_id,
        paciente: cita.paciente_nombre,
        rut: cita.paciente_rut,
        telefono: cita.paciente_telefono,
        fecha: cita.fecha,
        hora: cita.hora,
        duracion: cita.duracion,
        tipo: cita.tipo,
        estado: cita.estado,
        notas: cita.notas,
        createdAt: cita.created_at,
        updatedAt: cita.updated_at
      }
    });

  } catch (error: any) {
    console.error('Error al obtener cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la cita' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una cita
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { pacienteId, fecha, hora, duracion, tipo, estado, notas } = body;

    // Verificar que la cita existe
    const citaExistente = await db.prepare('SELECT id FROM citas WHERE id = ?').get(id);
    if (!citaExistente) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Si se está cambiando fecha u hora, verificar conflictos
    if (fecha && hora) {
      const conflicto: any = await db.prepare(`
        SELECT id FROM citas 
        WHERE fecha = ? AND hora = ? AND id != ? AND estado != 'cancelada'
      `).get(fecha, hora, id);

      if (conflicto) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una cita en ese horario' },
          { status: 409 }
        );
      }
    }

    // Construir la query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];

    if (pacienteId !== undefined) {
      updates.push('paciente_id = ?');
      values.push(pacienteId);
    }
    if (fecha !== undefined) {
      updates.push('fecha = ?');
      values.push(fecha);
    }
    if (hora !== undefined) {
      updates.push('hora = ?');
      values.push(hora);
    }
    if (duracion !== undefined) {
      updates.push('duracion = ?');
      values.push(duracion);
    }
    if (tipo !== undefined) {
      updates.push('tipo = ?');
      values.push(tipo);
    }
    if (estado !== undefined) {
      updates.push('estado = ?');
      values.push(estado);
    }
    if (notas !== undefined) {
      updates.push('notas = ?');
      values.push(notas);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE citas SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(query).run(...values);

    // Si la cita tiene una sesión asociada, actualizar la sesión también
    const sesionRelacionada: any = await db.prepare('SELECT id FROM sesiones WHERE cita_id = ?').get(id);
    if (sesionRelacionada) {
      const sesionUpdates: string[] = [];
      const sesionValues: any[] = [];

      if (fecha !== undefined) {
        sesionUpdates.push('fecha = ?');
        sesionValues.push(fecha);
      }
      if (hora !== undefined) {
        sesionUpdates.push('hora = ?');
        sesionValues.push(hora);
      }
      if (duracion !== undefined) {
        sesionUpdates.push('duracion = ?');
        sesionValues.push(duracion);
      }
      if (tipo !== undefined) {
        sesionUpdates.push('tipo = ?');
        sesionValues.push(tipo);
      }
      if (estado !== undefined) {
        sesionUpdates.push('estado = ?');
        sesionValues.push(estado);
      }

      if (sesionUpdates.length > 0) {
        sesionUpdates.push('updated_at = CURRENT_TIMESTAMP');
        sesionValues.push(sesionRelacionada.id);
        
        const sesionQuery = `UPDATE sesiones SET ${sesionUpdates.join(', ')} WHERE id = ?`;
        await db.prepare(sesionQuery).run(...sesionValues);
        console.log(`✅ Sesión ${sesionRelacionada.id} actualizada automáticamente`);
      }
    }

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
      message: 'Cita actualizada exitosamente',
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
    console.error('Error al actualizar cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la cita' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una cita
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Verificar que la cita existe
    const cita = await db.prepare('SELECT id FROM citas WHERE id = ?').get(id);
    if (!cita) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la cita
    await db.prepare('DELETE FROM citas WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Cita eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error al eliminar cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la cita' },
      { status: 500 }
    );
  }
}
