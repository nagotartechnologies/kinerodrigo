import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { asegurarEpisodio, getEpisodioActual } from '@/lib/episodios';

// GET - Obtener historial consolidado de un paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el paciente existe
    const paciente: any = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND activo = 1').get(id);
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Obtener citas del paciente
    const citas: any[] = await db.prepare(`
      SELECT id, fecha, hora, duracion, tipo, estado, notas, created_at
      FROM citas 
      WHERE paciente_id = ?
      ORDER BY fecha DESC, hora DESC
    `).all(id);

    // Asegurar episodios (migración perezosa) y obtenerlos
    await asegurarEpisodio(id);
    const episodios: any[] = await db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id) as total_sesiones,
        (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id AND s.estado = 'completada') as sesiones_completadas
      FROM episodios e
      WHERE e.paciente_id = ?
      ORDER BY e.numero_episodio DESC
    `).all(id);
    const episodioActual = await getEpisodioActual(id);

    // Obtener sesiones del paciente
    const sesiones: any[] = await db.prepare(`
      SELECT id, episodio_id, cita_id, fecha, hora, duracion, tipo, estado, numero_sesion,
             notas_sesion, ejercicios_realizados, observaciones,
             dolor_inicial, dolor_final, borg_percepcion, movilidad, fuerza,
             progreso_general, recomendaciones, proxima_sesion, created_at
      FROM sesiones 
      WHERE paciente_id = ?
      ORDER BY fecha DESC, hora DESC
    `).all(id);

    // Obtener pagos del paciente
    const pagos: any[] = await db.prepare(`
      SELECT id, monto, metodo_pago, estado, fecha_pago, concepto, notas, created_at
      FROM pagos 
      WHERE paciente_id = ?
      ORDER BY fecha_pago DESC
    `).all(id);

    // Obtener recordatorios del paciente (a través de citas)
    const citaIds = citas.map((c: any) => c.id);
    let recordatorios: any[] = [];
    if (citaIds.length > 0) {
      const placeholders = citaIds.map(() => '?').join(',');
      recordatorios = await db.prepare(`
        SELECT id, cita_id, estado, respuesta, enviado_at, respuesta_at
        FROM recordatorios 
        WHERE cita_id IN (${placeholders})
        ORDER BY enviado_at DESC
      `).all(...citaIds);
    }

    // Calcular estadísticas del paciente
    const sesionesCompletadas = sesiones.filter((s: any) => s.estado === 'completada');
    const totalPagado = pagos
      .filter((p: any) => p.estado === 'completado')
      .reduce((sum: number, p: any) => sum + (p.monto || 0), 0);

    // Calcular evolución del dolor
    const evolucionDolor = sesionesCompletadas
      .filter((s: any) => s.dolor_inicial !== null && s.dolor_final !== null)
      .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))
      .map((s: any) => ({
        fecha: s.fecha,
        dolorInicial: s.dolor_inicial,
        dolorFinal: s.dolor_final,
        numeroSesion: s.numero_sesion
      }));

    const estadisticas = {
      totalCitas: citas.length,
      citasPendientes: citas.filter((c: any) => c.estado === 'pendiente').length,
      citasCompletadas: citas.filter((c: any) => c.estado === 'completada').length,
      citasCanceladas: citas.filter((c: any) => c.estado === 'cancelada').length,
      totalSesiones: sesiones.length,
      sesionesCompletadas: sesionesCompletadas.length,
      totalPagado,
      cantidadPagos: pagos.length,
      recordatoriosEnviados: recordatorios.length,
      recordatoriosRespondidos: recordatorios.filter((r: any) => r.respuesta).length,
      evolucionDolor
    };

    return NextResponse.json({
      success: true,
      paciente,
      citas,
      episodios,
      episodioActualId: episodioActual?.id || null,
      sesiones: sesiones.map((s: any) => ({
        id: s.id,
        episodioId: s.episodio_id,
        citaId: s.cita_id,
        fecha: s.fecha,
        hora: s.hora,
        duracion: s.duracion,
        tipo: s.tipo,
        estado: s.estado,
        numeroSesion: s.numero_sesion,
        notasSesion: s.notas_sesion,
        ejerciciosRealizados: s.ejercicios_realizados ? JSON.parse(s.ejercicios_realizados) : [],
        observaciones: s.observaciones,
        dolorInicial: s.dolor_inicial,
        dolorFinal: s.dolor_final,
        borgPercepcion: s.borg_percepcion,
        movilidad: s.movilidad,
        fuerza: s.fuerza,
        progresoGeneral: s.progreso_general,
        recomendaciones: s.recomendaciones,
        proximaSesion: s.proxima_sesion,
        createdAt: s.created_at
      })),
      pagos,
      recordatorios,
      estadisticas
    });

  } catch (error: any) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial del paciente' },
      { status: 500 }
    );
  }
}
