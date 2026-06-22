import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Verificar configuración de Green API
    const greenApiConfig = {
      instanceId: process.env.GREEN_API_INSTANCE_ID || 'NO CONFIGURADO',
      hasToken: !!process.env.GREEN_API_TOKEN,
      testMode: process.env.GREEN_API_TEST_MODE === 'true',
      url: process.env.GREEN_API_URL || 'https://api.green-api.com'
    };

    // Obtener estadísticas de recordatorios
    const recordatoriosStats: any = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN respuesta IS NOT NULL THEN 1 ELSE 0 END) as con_respuesta,
        SUM(CASE WHEN respuesta IS NULL THEN 1 ELSE 0 END) as sin_respuesta,
        SUM(CASE WHEN respuesta = 'CONFIRMAR' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN respuesta = 'CANCELAR' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN respuesta = 'REAGENDAR' THEN 1 ELSE 0 END) as reagendadas
      FROM recordatorios
    `).get();

    // Obtener últimos 5 recordatorios
    const ultimosRecordatorios = db.prepare(`
      SELECT 
        r.id,
        r.cita_id,
        r.telefono,
        r.estado,
        r.respuesta,
        r.enviado_at,
        r.respuesta_at,
        c.fecha as cita_fecha,
        c.hora as cita_hora,
        c.estado as cita_estado,
        p.nombre as paciente_nombre
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      ORDER BY r.enviado_at DESC
      LIMIT 5
    `).all();

    // Obtener citas pendientes de confirmación
    const citasPendientes = db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        p.nombre as paciente_nombre,
        p.telefono,
        (SELECT COUNT(*) FROM recordatorios WHERE cita_id = c.id) as recordatorios_enviados
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.estado = 'programada'
        AND c.fecha >= date('now')
      ORDER BY c.fecha, c.hora
      LIMIT 10
    `).all();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      greenApi: {
        configurado: greenApiConfig.instanceId !== 'NO CONFIGURADO' && greenApiConfig.hasToken,
        modoTest: greenApiConfig.testMode,
        instanceId: greenApiConfig.instanceId === 'NO CONFIGURADO' ? 'NO CONFIGURADO' : greenApiConfig.instanceId.substring(0, 4) + '...',
        url: greenApiConfig.url
      },
      estadisticas: {
        recordatorios: {
          total: recordatoriosStats.total || 0,
          conRespuesta: recordatoriosStats.con_respuesta || 0,
          sinRespuesta: recordatoriosStats.sin_respuesta || 0,
          confirmadas: recordatoriosStats.confirmadas || 0,
          canceladas: recordatoriosStats.canceladas || 0,
          reagendadas: recordatoriosStats.reagendadas || 0
        }
      },
      ultimosRecordatorios,
      citasPendientes,
      recomendaciones: getRecomendaciones(greenApiConfig, recordatoriosStats)
    });
  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function getRecomendaciones(config: any, stats: any) {
  const recomendaciones = [];

  if (config.instanceId === 'NO CONFIGURADO' || !config.hasToken) {
    recomendaciones.push({
      tipo: 'error',
      mensaje: 'Green API no está configurado. Configura GREEN_API_INSTANCE_ID y GREEN_API_TOKEN en .env.local'
    });
  }

  if (config.testMode) {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: 'Modo de prueba activado. Los mensajes no se envían realmente. Cambia GREEN_API_TEST_MODE a "false" en .env.local'
    });
  }

  if (stats.total > 0 && stats.con_respuesta === 0) {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: 'Se han enviado recordatorios pero no hay respuestas. Verifica que el webhook esté configurado correctamente en Green API.'
    });
  }

  if (stats.sin_respuesta > 10) {
    recomendaciones.push({
      tipo: 'info',
      mensaje: `Hay ${stats.sin_respuesta} recordatorios sin respuesta. Considera hacer seguimiento manual.`
    });
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push({
      tipo: 'success',
      mensaje: 'Todo parece estar funcionando correctamente'
    });
  }

  return recomendaciones;
}
