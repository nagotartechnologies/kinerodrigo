import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener estadísticas de sesiones
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    // Total de sesiones
    const totalSesiones: any = await db.prepare('SELECT COUNT(*) as total FROM sesiones').get();

    // Sesiones de hoy
    const sesionesHoy: any = await db.prepare('SELECT COUNT(*) as total FROM sesiones WHERE fecha = ?').get(hoy);

    // Sesiones del mes actual
    const sesionesMes: any = await db.prepare('SELECT COUNT(*) as total FROM sesiones WHERE fecha >= ?').get(inicioMesStr);

    // Sesiones por estado
    const porEstado = await db.prepare(`
      SELECT estado, COUNT(*) as cantidad
      FROM sesiones
      GROUP BY estado
    `).all();

    // Sesiones completadas del mes
    const completadasMes: any = await db.prepare(`
      SELECT COUNT(*) as total
      FROM sesiones
      WHERE fecha >= ? AND estado = 'completada'
    `).get(inicioMesStr);

    // Próximas sesiones (programadas y confirmadas)
    const proximasSesiones = await db.prepare(`
      SELECT 
        s.id,
        s.fecha,
        s.hora,
        s.tipo,
        s.estado,
        p.nombre as paciente
      FROM sesiones s
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      WHERE s.fecha >= ? AND s.estado IN ('programada', 'confirmada')
      ORDER BY s.fecha ASC, s.hora ASC
      LIMIT 10
    `).all(hoy);

    // Sesiones por tipo
    const porTipo = await db.prepare(`
      SELECT tipo, COUNT(*) as cantidad
      FROM sesiones
      GROUP BY tipo
    `).all();

    // Progreso promedio (de sesiones completadas con progreso)
    const progresoPromedio: any = await db.prepare(`
      SELECT AVG(
        CASE 
          WHEN progreso_general = 'excelente' THEN 5
          WHEN progreso_general = 'bueno' THEN 4
          WHEN progreso_general = 'regular' THEN 3
          WHEN progreso_general = 'malo' THEN 2
          ELSE 1
        END
      ) as promedio
      FROM sesiones
      WHERE estado = 'completada' AND progreso_general IS NOT NULL
    `).get();

    return NextResponse.json({
      success: true,
      estadisticas: {
        total: totalSesiones.total,
        hoy: sesionesHoy.total,
        mesActual: sesionesMes.total,
        completadasMes: completadasMes.total,
        porEstado,
        porTipo,
        proximasSesiones,
        progresoPromedio: progresoPromedio.promedio ? parseFloat(progresoPromedio.promedio.toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
