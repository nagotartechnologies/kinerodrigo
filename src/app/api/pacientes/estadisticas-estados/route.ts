import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener estadísticas de estados de pacientes
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Contar pacientes por estado
    const estadisticas: any[] = await db.prepare(`
      SELECT 
        COALESCE(estado_paciente, 'activo') as estado,
        COUNT(*) as cantidad
      FROM pacientes
      WHERE activo = 1
      GROUP BY estado_paciente
    `).all();

    // Obtener total de pacientes activos (no eliminados)
    const totalResult: any = await db.prepare(
      'SELECT COUNT(*) as total FROM pacientes WHERE activo = 1'
    ).get();
    const total = totalResult?.total || 0;

    // Formatear estadísticas
    const stats = {
      activo: 0,
      alta: 0,
      abandono: 0,
      total
    };

    estadisticas.forEach((stat: any) => {
      const estado = stat.estado || 'activo';
      if (estado in stats) {
        stats[estado as keyof typeof stats] = stat.cantidad;
      }
    });

    // Obtener cambios recientes de estado (últimos 30 días)
    const cambiosRecientes: any[] = await db.prepare(`
      SELECT 
        h.id,
        h.paciente_id,
        p.nombre as paciente_nombre,
        h.estado_anterior,
        h.estado_nuevo,
        h.motivo,
        h.created_at
      FROM historial_estados_paciente h
      JOIN pacientes p ON h.paciente_id = p.id
      WHERE h.created_at >= date('now', '-30 days')
      ORDER BY h.created_at DESC
      LIMIT 20
    `).all();

    // Contar cambios por tipo en últimos 30 días
    const cambiosPorTipo: any[] = await db.prepare(`
      SELECT 
        estado_nuevo,
        COUNT(*) as cantidad
      FROM historial_estados_paciente
      WHERE created_at >= date('now', '-30 days')
      GROUP BY estado_nuevo
    `).all();

    return NextResponse.json({
      success: true,
      estadisticas: stats,
      porcentajes: {
        activo: total > 0 ? Math.round((stats.activo / total) * 100) : 0,
        alta: total > 0 ? Math.round((stats.alta / total) * 100) : 0,
        abandono: total > 0 ? Math.round((stats.abandono / total) * 100) : 0
      },
      cambiosRecientes: cambiosRecientes.map((c: any) => ({
        id: c.id,
        pacienteId: c.paciente_id,
        pacienteNombre: c.paciente_nombre,
        estadoAnterior: c.estado_anterior,
        estadoNuevo: c.estado_nuevo,
        motivo: c.motivo,
        fecha: c.created_at
      })),
      cambiosPorTipo: cambiosPorTipo.map((c: any) => ({
        estado: c.estado_nuevo,
        cantidad: c.cantidad
      }))
    });

  } catch (error: any) {
    console.error('Error al obtener estadísticas de estados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas de estados' },
      { status: 500 }
    );
  }
}
