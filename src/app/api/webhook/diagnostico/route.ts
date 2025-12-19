import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Diagnóstico del sistema de webhooks y mensajes
export async function GET() {
  try {
    // 1. Verificar configuración de Green API
    const greenApiConfigured = !!(
      process.env.GREEN_API_INSTANCE_ID && 
      process.env.GREEN_API_TOKEN
    );

    // 2. Verificar últimos recordatorios enviados
    const ultimosRecordatorios = await db.prepare(`
      SELECT 
        r.id,
        r.telefono,
        r.estado,
        r.respuesta,
        r.enviado_at,
        r.respuesta_at,
        c.id as cita_id,
        p.nombre as paciente_nombre
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      ORDER BY r.enviado_at DESC
      LIMIT 10
    `).all();

    // 3. Verificar recordatorios pendientes de respuesta
    const pendientesRespuestaResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM recordatorios
      WHERE estado = 'enviado' AND respuesta IS NULL
    `).get();
    const pendientesRespuesta = { total: Number(pendientesRespuestaResult?.total || 0) };

    // 4. Verificar recordatorios con respuesta
    const conRespuestaResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM recordatorios
      WHERE respuesta IS NOT NULL
    `).get();
    const conRespuesta = { total: Number(conRespuestaResult?.total || 0) };

    // 5. Verificar variables de entorno
    const envVars = {
      GREEN_API_URL: process.env.GREEN_API_URL || 'No configurado',
      GREEN_API_INSTANCE_ID: process.env.GREEN_API_INSTANCE_ID ? '✅ Configurado' : '❌ No configurado',
      GREEN_API_TOKEN: process.env.GREEN_API_TOKEN ? '✅ Configurado' : '❌ No configurado',
      GREEN_API_TEST_MODE: process.env.GREEN_API_TEST_MODE || 'false',
    };

    return NextResponse.json({
      success: true,
      diagnostico: {
        greenApiConfigured,
        envVars,
        estadisticas: {
          ultimosRecordatorios: ultimosRecordatorios.length,
          pendientesRespuesta: pendientesRespuesta.total,
          conRespuesta: conRespuesta.total,
        },
        ultimosRecordatorios,
      },
      recomendaciones: [
        !greenApiConfigured && '⚠️ Green API no está configurado. Verifica las variables de entorno.',
        pendientesRespuesta.total > 0 && `📱 Hay ${pendientesRespuesta.total} recordatorios sin respuesta.`,
        conRespuesta.total === 0 && ultimosRecordatorios.length > 0 && '❌ Se han enviado recordatorios pero no hay respuestas. Verifica que el webhook esté configurado en Green API.',
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
