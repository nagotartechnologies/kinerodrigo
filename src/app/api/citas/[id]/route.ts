import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener una cita por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    // Si se está cambiando fecha u hora, verificar conflictos (considerando duración)
    // Dos rangos se solapan si: inicio1 < fin2 AND inicio2 < fin1
    if (fecha && hora) {
      const duracionCheck = duracion || 60;
      // Calcular minutos de la nueva cita en JS para evitar problemas con parámetros SQL
      const [h, m] = hora.split(':').map(Number);
      const nuevaInicio = h * 60 + m;
      const nuevaFin = nuevaInicio + duracionCheck;

      const conflictos: any[] = await db.prepare(`
        SELECT id, hora, duracion FROM citas 
        WHERE fecha = ? AND id != ? AND estado NOT IN ('cancelada', 'completada')
          AND (CAST(substr(hora, 1, 2) AS INTEGER) * 60 + CAST(substr(hora, 4, 2) AS INTEGER)) < ?
          AND ? < (CAST(substr(hora, 1, 2) AS INTEGER) * 60 + CAST(substr(hora, 4, 2) AS INTEGER) + COALESCE(duracion, 60))
      `).all(fecha, id, nuevaFin, nuevaInicio);

      if (conflictos.length >= 2) {
        console.log(`⚠️ Conflicto al mover cita ${id} a ${fecha} ${hora}: ya hay 2 citas`, conflictos.map(c => `#${c.id} ${c.hora} (${c.duracion}min)`));
        return NextResponse.json(
          { success: false, error: `Ya hay 2 citas agendadas en ese horario (máximo permitido)` },
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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    // Eliminar datos relacionados en orden correcto
    // 1. Eliminar recordatorios asociados a la cita
    await db.prepare('DELETE FROM recordatorios WHERE cita_id = ?').run(id);
    
    // 2. Eliminar sesiones asociadas a la cita
    await db.prepare('DELETE FROM sesiones WHERE cita_id = ?').run(id);
    
    // 3. Eliminar la cita
    await db.prepare('DELETE FROM citas WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Cita y datos relacionados eliminados exitosamente'
    });

  } catch (error: any) {
    console.error('Error al eliminar cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la cita' },
      { status: 500 }
    );
  }
}
