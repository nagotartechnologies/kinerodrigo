import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { sendWhatsAppMessage, formatearMensajeRecordatorio } from '@/lib/whatsapp';
import { registrarErrorEnvio } from '@/lib/cron';

// POST - Enviar recordatorios masivos para citas de una fecha específica
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fecha, citaIds } = body;

    if (!fecha && (!citaIds || citaIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Se requiere fecha o lista de citaIds' },
        { status: 400 }
      );
    }

    // Buscar citas pendientes de recordatorio
    let citas: any[];

    if (citaIds && citaIds.length > 0) {
      // Enviar a citas específicas
      const placeholders = citaIds.map(() => '?').join(',');
      citas = await db.prepare(`
        SELECT 
          c.id, c.fecha, c.hora, c.duracion, c.tipo, c.estado,
          p.nombre as paciente_nombre,
          p.telefono as paciente_telefono
        FROM citas c
        INNER JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.id IN (${placeholders})
          AND c.estado IN ('pendiente', 'confirmada')
          AND p.activo = 1
          AND p.telefono IS NOT NULL
          AND p.telefono != ''
        ORDER BY c.hora ASC
      `).all(...citaIds);
    } else {
      // Enviar a todas las citas de la fecha sin recordatorio
      citas = await db.prepare(`
        SELECT 
          c.id, c.fecha, c.hora, c.duracion, c.tipo, c.estado,
          p.nombre as paciente_nombre,
          p.telefono as paciente_telefono
        FROM citas c
        INNER JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.fecha = ?
          AND c.estado IN ('pendiente', 'confirmada')
          AND p.activo = 1
          AND p.telefono IS NOT NULL
          AND p.telefono != ''
          AND NOT EXISTS (
            SELECT 1 FROM recordatorios r WHERE r.cita_id = c.id AND r.estado = 'enviado'
          )
        ORDER BY c.hora ASC
      `).all(fecha);
    }

    if (citas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay citas pendientes de recordatorio',
        enviados: 0,
        errores: 0,
        total: 0,
        detalles: []
      });
    }

    const detalles: any[] = [];
    let enviados = 0;
    let errores = 0;

    for (const cita of citas) {
      try {
        const mensaje = await formatearMensajeRecordatorio({
          paciente: cita.paciente_nombre,
          fecha: cita.fecha,
          hora: cita.hora,
          tipo: cita.tipo,
          duracion: cita.duracion
        });

        // Enviar mensaje de texto plano (sin botones interactivos)
        const resultado = await sendWhatsAppMessage({
          phone: cita.paciente_telefono,
          message: mensaje
        });

        // Registrar en BD
        await db.prepare(`
          INSERT INTO recordatorios (cita_id, mensaje_id, telefono, mensaje, estado, enviado_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(cita.id, resultado.idMessage || null, cita.paciente_telefono, mensaje, 'enviado');

        enviados++;
        detalles.push({
          citaId: cita.id,
          paciente: cita.paciente_nombre,
          hora: cita.hora,
          estado: 'enviado'
        });

        // Esperar 2s entre mensajes
        if (citas.indexOf(cita) < citas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        errores++;
        await registrarErrorEnvio(cita.id, cita.paciente_telefono, error.message);
        detalles.push({
          citaId: cita.id,
          paciente: cita.paciente_nombre,
          hora: cita.hora,
          estado: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${enviados} recordatorio(s) enviado(s)${errores > 0 ? `, ${errores} error(es)` : ''}`,
      enviados,
      errores,
      total: citas.length,
      detalles
    });

  } catch (error: any) {
    console.error('Error en envío masivo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al enviar recordatorios masivos' },
      { status: 500 }
    );
  }
}

// GET - Obtener resumen de recordatorios pendientes para una fecha
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    if (!fecha) {
      return NextResponse.json(
        { success: false, error: 'Se requiere parámetro fecha' },
        { status: 400 }
      );
    }

    // Citas totales de la fecha
    const totalCitas: any = await db.prepare(`
      SELECT COUNT(*) as total
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.fecha = ? AND c.estado IN ('pendiente', 'confirmada') AND p.activo = 1
    `).get(fecha);

    // Citas con recordatorio enviado hoy
    const conRecordatorio: any = await db.prepare(`
      SELECT COUNT(DISTINCT c.id) as total
      FROM citas c
      INNER JOIN recordatorios r ON r.cita_id = c.id
      WHERE c.fecha = ? AND c.estado IN ('pendiente', 'confirmada')
        AND r.estado = 'enviado'
    `).get(fecha);

    // Citas sin recordatorio y con teléfono
    const sinRecordatorio: any = await db.prepare(`
      SELECT COUNT(*) as total
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.fecha = ? AND c.estado IN ('pendiente', 'confirmada')
        AND p.activo = 1 AND p.telefono IS NOT NULL AND p.telefono != ''
        AND NOT EXISTS (SELECT 1 FROM recordatorios r WHERE r.cita_id = c.id AND r.estado = 'enviado')
    `).get(fecha);

    return NextResponse.json({
      success: true,
      fecha,
      totalCitas: totalCitas?.total || 0,
      conRecordatorio: conRecordatorio?.total || 0,
      sinRecordatorio: sinRecordatorio?.total || 0
    });

  } catch (error: any) {
    console.error('Error al obtener resumen:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
