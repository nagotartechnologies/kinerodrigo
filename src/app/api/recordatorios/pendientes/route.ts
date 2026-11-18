import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { marcarRevisadosSchema } from '@/lib/schemas/configuracion';

// GET - Respuestas de pacientes (cancelaciones y pedidos de reagendar) sin revisar
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const filas: any[] = await db.prepare(`
      SELECT
        r.id, r.cita_id, r.respuesta, r.respuesta_at, r.cancelacion_tardia,
        c.fecha, c.hora, c.estado,
        p.nombre as paciente_nombre, p.telefono as paciente_telefono
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE r.respuesta IN ('CANCELAR', 'REAGENDAR')
        AND COALESCE(r.revisado, 0) = 0
      ORDER BY r.respuesta_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json({
      success: true,
      pendientes: filas.map(f => ({
        id: f.id,
        citaId: f.cita_id,
        respuesta: f.respuesta,
        respuestaAt: f.respuesta_at,
        tardia: !!f.cancelacion_tardia,
        fecha: f.fecha,
        hora: f.hora,
        estadoCita: f.estado,
        paciente: f.paciente_nombre,
        telefono: f.paciente_telefono
      }))
    });
  } catch (error: any) {
    console.error('Error al obtener respuestas pendientes:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener respuestas pendientes' }, { status: 500 });
  }
}

// POST - Marcar respuestas como revisadas: { ids: number[] }
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const validacion = await validarBody(request, marcarRevisadosSchema);
    if (!validacion.ok) return validacion.response;
    const { ids } = validacion.data;
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`UPDATE recordatorios SET revisado = 1 WHERE id IN (${placeholders})`).run(...ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respuestaError(error, 'Error al marcar como revisadas');
  }
}
