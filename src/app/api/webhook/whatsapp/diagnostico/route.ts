import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Diagnóstico de recordatorios y respuestas
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get('telefono');

    let query = `
      SELECT 
        r.id,
        r.cita_id,
        r.telefono,
        r.estado,
        r.respuesta,
        r.respuesta_at,
        r.mensaje_respuesta_id,
        r.mensaje_respuesta_enviado,
        r.error_respuesta,
        r.enviado_at,
        c.fecha,
        c.hora,
        c.estado as cita_estado,
        p.nombre as paciente_nombre
      FROM recordatorios r
      LEFT JOIN citas c ON r.cita_id = c.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
    `;

    const params: any[] = [];

    if (telefono) {
      const phoneClean = telefono.replace(/\D/g, '');
      const phoneLast8 = phoneClean.slice(-8);
      query += ` WHERE (r.telefono LIKE ? OR r.telefono LIKE ? OR r.telefono LIKE ?)`;
      params.push(`%${phoneLast8}%`, `%${phoneClean}%`, `%${telefono}%`);
    }

    query += ` ORDER BY r.enviado_at DESC LIMIT 10`;

    const recordatorios = await db.prepare(query).all(...params);

    // Estadísticas
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN respuesta IS NOT NULL THEN 1 ELSE 0 END) as con_respuesta,
        SUM(CASE WHEN respuesta = 'CONFIRMAR' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN respuesta = 'CANCELAR' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN respuesta = 'REAGENDAR' THEN 1 ELSE 0 END) as reagendadas,
        SUM(CASE WHEN mensaje_respuesta_enviado = 1 THEN 1 ELSE 0 END) as respuestas_enviadas,
        SUM(CASE WHEN error_respuesta IS NOT NULL THEN 1 ELSE 0 END) as con_errores
      FROM recordatorios
    `).get();

    return NextResponse.json({
      success: true,
      recordatorios,
      estadisticas: stats,
      mensaje: 'Diagnóstico de recordatorios de WhatsApp'
    });

  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al obtener diagnóstico' 
      },
      { status: 500 }
    );
  }
}
