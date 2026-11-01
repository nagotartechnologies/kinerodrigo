import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener estadísticas de citas
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // formato: YYYY-MM
    const año = searchParams.get('año'); // formato: YYYY

    // Total de citas
    const totalCitas: any = await db.prepare('SELECT COUNT(*) as total FROM citas').get();

    // Citas por estado
    const citasPorEstado = await db.prepare(`
      SELECT estado, COUNT(*) as cantidad
      FROM citas
      GROUP BY estado
    `).all();

    // Citas del mes actual
    const fechaActual = new Date();
    const mesActual = fechaActual.toISOString().slice(0, 7); // YYYY-MM
    
    const citasMesActual: any = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM citas 
      WHERE fecha LIKE ?
    `).get(`${mesActual}%`);

    // Citas de hoy
    const hoy = fechaActual.toISOString().split('T')[0];
    const citasHoy: any = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM citas 
      WHERE fecha = ?
    `).get(hoy);

    // Citas pendientes
    const citasPendientes: any = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM citas 
      WHERE estado = 'pendiente' AND fecha >= ?
    `).get(hoy);

    // Citas por tipo
    const citasPorTipo = await db.prepare(`
      SELECT tipo, COUNT(*) as cantidad
      FROM citas
      GROUP BY tipo
    `).all();

    // Próximas citas (próximos 7 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 7);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

    const proximasCitas = await db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.tipo,
        c.estado,
        p.nombre as paciente
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.fecha BETWEEN ? AND ?
      ORDER BY c.fecha ASC, c.hora ASC
      LIMIT 10
    `).all(hoy, fechaLimiteStr);

    // Citas por mes (últimos 6 meses)
    const citasPorMes = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mesStr = fecha.toISOString().slice(0, 7);
      
      const count: any = await db.prepare(`
        SELECT COUNT(*) as total 
        FROM citas 
        WHERE fecha LIKE ?
      `).get(`${mesStr}%`);
      
      citasPorMes.push({
        mes: mesStr,
        total: count.total
      });
    }

    return NextResponse.json({
      success: true,
      estadisticas: {
        total: totalCitas.total,
        mesActual: citasMesActual.total,
        hoy: citasHoy.total,
        pendientes: citasPendientes.total,
        porEstado: citasPorEstado,
        porTipo: citasPorTipo,
        proximasCitas: proximasCitas,
        porMes: citasPorMes
      }
    });

  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas', detalle: error?.message || String(error) },
      { status: 500 }
    );
  }
}
