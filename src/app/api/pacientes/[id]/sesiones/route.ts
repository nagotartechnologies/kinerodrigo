import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener sesiones de un paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id: idStr } = await params;
    const pacienteId = parseInt(idStr);

    // Verificar que el paciente existe
    const paciente = await db.prepare('SELECT id, nombre FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener sesiones del paciente
    const sesiones = await db.prepare(`
      SELECT 
        id,
        fecha,
        hora,
        duracion,
        tipo,
        estado,
        notas_sesion,
        ejercicios_realizados,
        observaciones,
        dolor_inicial,
        dolor_final,
        movilidad,
        fuerza,
        progreso_general,
        recomendaciones,
        proxima_sesion,
        created_at
      FROM sesiones
      WHERE paciente_id = ?
      ORDER BY fecha ASC, hora ASC
    `).all(pacienteId);

    // Formatear sesiones
    const sesionesFormateadas = sesiones.map((sesion: any) => ({
      id: sesion.id,
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
      createdAt: sesion.created_at
    }));

    return NextResponse.json({
      success: true,
      paciente: paciente,
      sesiones: sesionesFormateadas,
      total: sesionesFormateadas.length
    });
  } catch (error) {
    console.error('Error al obtener sesiones del paciente:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener sesiones' },
      { status: 500 }
    );
  }
}
