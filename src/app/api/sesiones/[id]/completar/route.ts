import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// PUT - Completar una sesión (flujo rápido)
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
    const {
      dolorInicial,
      dolorFinal,
      borgPercepcion,
      movilidad,
      fuerza,
      progresoGeneral,
      ejerciciosRealizados,
      observaciones,
      recomendaciones
    } = body;

    // Verificar que la sesión existe y no está ya completada
    const sesionExistente: any = await db.prepare(
      'SELECT id, estado, cita_id FROM sesiones WHERE id = ?'
    ).get(id);

    if (!sesionExistente) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    if (sesionExistente.estado === 'completada') {
      return NextResponse.json(
        { success: false, error: 'La sesión ya está completada' },
        { status: 400 }
      );
    }

    // Actualizar solo campos clínicos + estado a completada
    await db.prepare(`
      UPDATE sesiones SET
        estado = 'completada',
        dolor_inicial = ?,
        dolor_final = ?,
        borg_percepcion = ?,
        movilidad = ?,
        fuerza = ?,
        progreso_general = ?,
        ejercicios_realizados = ?,
        observaciones = ?,
        recomendaciones = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      dolorInicial !== undefined && dolorInicial !== null ? dolorInicial : null,
      dolorFinal !== undefined && dolorFinal !== null ? dolorFinal : null,
      borgPercepcion !== undefined && borgPercepcion !== null ? borgPercepcion : null,
      movilidad || null,
      fuerza || null,
      progresoGeneral || null,
      ejerciciosRealizados ? JSON.stringify(ejerciciosRealizados) : null,
      observaciones || null,
      recomendaciones || null,
      id
    );

    // Si la sesión tiene una cita asociada, actualizar su estado también
    if (sesionExistente.cita_id) {
      await db.prepare(`
        UPDATE citas SET
          estado = 'completada',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sesionExistente.cita_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Sesión completada exitosamente'
    });
  } catch (error) {
    console.error('Error al completar sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al completar la sesión' },
      { status: 500 }
    );
  }
}
