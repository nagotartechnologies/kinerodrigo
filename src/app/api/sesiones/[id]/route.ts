import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener una sesión por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const sesion: any = await db.prepare(`
      SELECT 
        s.id,
        s.paciente_id,
        s.cita_id,
        s.fecha,
        s.hora,
        s.duracion,
        s.tipo,
        s.estado,
        s.notas_sesion,
        s.ejercicios_realizados,
        s.observaciones,
        s.dolor_inicial,
        s.dolor_final,
        s.movilidad,
        s.fuerza,
        s.progreso_general,
        s.recomendaciones,
        s.proxima_sesion,
        s.created_at,
        s.updated_at,
        p.nombre as paciente_nombre,
        p.rut as paciente_rut,
        p.telefono as paciente_telefono
      FROM sesiones s
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      WHERE s.id = ?
    `).get(id);

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sesion: {
        id: sesion.id,
        pacienteId: sesion.paciente_id,
        citaId: sesion.cita_id,
        paciente: sesion.paciente_nombre,
        rut: sesion.paciente_rut,
        telefono: sesion.paciente_telefono,
        fecha: sesion.fecha,
        hora: sesion.hora,
        duracion: sesion.duracion,
        tipo: sesion.tipo,
        estado: sesion.estado,
        notasSesion: sesion.notas_sesion,
        ejerciciosRealizados: sesion.ejercicios_realizados ? JSON.parse(sesion.ejercicios_realizados) : [],
        observaciones: sesion.observaciones,
        dolorInicial: sesion.dolor_inicial,
        dolorFinal: sesion.dolor_final,
        movilidad: sesion.movilidad,
        fuerza: sesion.fuerza,
        progresoGeneral: sesion.progreso_general,
        recomendaciones: sesion.recomendaciones,
        proximaSesion: sesion.proxima_sesion,
        createdAt: sesion.created_at,
        updatedAt: sesion.updated_at
      }
    });
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la sesión' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una sesión
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const {
      pacienteId,
      citaId,
      fecha,
      hora,
      duracion,
      tipo,
      estado,
      notasSesion,
      ejerciciosRealizados,
      observaciones,
      dolorInicial,
      dolorFinal,
      movilidad,
      fuerza,
      progresoGeneral,
      recomendaciones,
      proximaSesion
    } = body;

    // Verificar que la sesión existe
    const sesionExistente: any = await db.prepare('SELECT id, cita_id FROM sesiones WHERE id = ?').get(id);
    if (!sesionExistente) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar sesión
    await db.prepare(`
      UPDATE sesiones SET
        paciente_id = ?,
        cita_id = ?,
        fecha = ?,
        hora = ?,
        duracion = ?,
        tipo = ?,
        estado = ?,
        notas_sesion = ?,
        ejercicios_realizados = ?,
        observaciones = ?,
        dolor_inicial = ?,
        dolor_final = ?,
        movilidad = ?,
        fuerza = ?,
        progreso_general = ?,
        recomendaciones = ?,
        proxima_sesion = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      pacienteId,
      citaId || null,
      fecha,
      hora,
      duracion,
      tipo,
      estado,
      notasSesion || null,
      ejerciciosRealizados ? JSON.stringify(ejerciciosRealizados) : null,
      observaciones || null,
      dolorInicial || null,
      dolorFinal || null,
      movilidad || null,
      fuerza || null,
      progresoGeneral || null,
      recomendaciones || null,
      proximaSesion || null,
      id
    );

    // Si la sesión tiene una cita asociada, actualizar la cita también
    if (sesionExistente.cita_id) {
      await db.prepare(`
        UPDATE citas SET
          fecha = ?,
          hora = ?,
          duracion = ?,
          tipo = ?,
          estado = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        fecha,
        hora,
        duracion,
        tipo,
        estado,
        sesionExistente.cita_id
      );
      console.log(`✅ Cita ${sesionExistente.cita_id} actualizada automáticamente`);
    }

    return NextResponse.json({
      success: true,
      message: 'Sesión actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la sesión' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una sesión
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Verificar que la sesión existe
    const sesion = await db.prepare('SELECT id FROM sesiones WHERE id = ?').get(id);
    if (!sesion) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar sesión
    await db.prepare('DELETE FROM sesiones WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Sesión eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la sesión' },
      { status: 500 }
    );
  }
}
