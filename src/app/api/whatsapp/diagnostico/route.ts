import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Diagnóstico del sistema de WhatsApp
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get('telefono');

    // 1. Verificar configuración de proveedores
    const configAll: any = await db.prepare(`
      SELECT clave, valor 
      FROM configuraciones 
      WHERE clave IN ('greenapi_instance_id', 'greenapi_token', 'whatsapp_provider', 'ultramsg_instance_id', 'ultramsg_token')
    `).all();

    const config: Record<string, string> = {};
    configAll.forEach((c: any) => {
      if (c.clave === 'whatsapp_provider') {
        config[c.clave] = c.valor || 'auto';
      } else {
        config[c.clave] = c.valor ? '✅ Configurado' : '❌ No configurado';
      }
    });
    
    const proveedorActivo = config['whatsapp_provider'] || 'auto';

    // 2. Verificar modo de prueba
    const testMode = process.env.WHATSAPP_TEST_MODE === 'true';

    // 3. Últimos recordatorios enviados
    let ultimosRecordatorios;
    if (telefono) {
      ultimosRecordatorios = await db.prepare(`
        SELECT 
          r.id,
          r.cita_id,
          r.telefono,
          r.estado,
          r.respuesta,
          r.enviado_at,
          r.respuesta_at,
          r.mensaje_respuesta_enviado,
          r.error_respuesta,
          c.fecha,
          c.hora,
          c.estado as cita_estado,
          p.nombre as paciente_nombre
        FROM recordatorios r
        LEFT JOIN citas c ON r.cita_id = c.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        WHERE r.telefono LIKE ?
        ORDER BY r.enviado_at DESC
        LIMIT 10
      `).all(`%${telefono}%`);
    } else {
      ultimosRecordatorios = await db.prepare(`
        SELECT 
          r.id,
          r.cita_id,
          r.telefono,
          r.estado,
          r.respuesta,
          r.enviado_at,
          r.respuesta_at,
          r.mensaje_respuesta_enviado,
          r.error_respuesta,
          c.fecha,
          c.hora,
          c.estado as cita_estado,
          p.nombre as paciente_nombre
        FROM recordatorios r
        LEFT JOIN citas c ON r.cita_id = c.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        ORDER BY r.enviado_at DESC
        LIMIT 10
      `).all();
    }

    // 4. Recordatorios con respuesta pero sin confirmación enviada
    let recordatoriosSinConfirmacion;
    if (telefono) {
      recordatoriosSinConfirmacion = await db.prepare(`
        SELECT 
          r.id,
          r.cita_id,
          r.telefono,
          r.respuesta,
          r.respuesta_at,
          r.mensaje_respuesta_enviado,
          r.error_respuesta,
          p.nombre as paciente_nombre
        FROM recordatorios r
        LEFT JOIN citas c ON r.cita_id = c.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        WHERE r.respuesta IS NOT NULL 
          AND (r.mensaje_respuesta_enviado IS NULL OR r.mensaje_respuesta_enviado = 0)
          AND r.telefono LIKE ?
        ORDER BY r.respuesta_at DESC
        LIMIT 10
      `).all(`%${telefono}%`);
    } else {
      recordatoriosSinConfirmacion = await db.prepare(`
        SELECT 
          r.id,
          r.cita_id,
          r.telefono,
          r.respuesta,
          r.respuesta_at,
          r.mensaje_respuesta_enviado,
          r.error_respuesta,
          p.nombre as paciente_nombre
        FROM recordatorios r
        LEFT JOIN citas c ON r.cita_id = c.id
        LEFT JOIN pacientes p ON c.paciente_id = p.id
        WHERE r.respuesta IS NOT NULL 
          AND (r.mensaje_respuesta_enviado IS NULL OR r.mensaje_respuesta_enviado = 0)
        ORDER BY r.respuesta_at DESC
        LIMIT 10
      `).all();
    }

    // 5. Análisis de números de teléfono
    let pacientesConTelefono;
    if (telefono) {
      pacientesConTelefono = await db.prepare(`
        SELECT 
          id,
          nombre,
          telefono,
          LENGTH(REPLACE(REPLACE(REPLACE(telefono, ' ', ''), '-', ''), '+', '')) as longitud_limpia
        FROM pacientes
        WHERE telefono IS NOT NULL AND telefono != ''
          AND telefono LIKE ?
        ORDER BY id DESC
        LIMIT 10
      `).all(`%${telefono}%`);
    } else {
      pacientesConTelefono = await db.prepare(`
        SELECT 
          id,
          nombre,
          telefono,
          LENGTH(REPLACE(REPLACE(REPLACE(telefono, ' ', ''), '-', ''), '+', '')) as longitud_limpia
        FROM pacientes
        WHERE telefono IS NOT NULL AND telefono != ''
        ORDER BY id DESC
        LIMIT 10
      `).all();
    }

    // 6. Estadísticas generales
    const stats: any = await db.prepare(`
      SELECT 
        COUNT(*) as total_recordatorios,
        SUM(CASE WHEN respuesta IS NOT NULL THEN 1 ELSE 0 END) as con_respuesta,
        SUM(CASE WHEN respuesta = 'CONFIRMAR' THEN 1 ELSE 0 END) as confirmados,
        SUM(CASE WHEN respuesta = 'CANCELAR' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN mensaje_respuesta_enviado = 1 THEN 1 ELSE 0 END) as confirmaciones_enviadas,
        SUM(CASE WHEN error_respuesta IS NOT NULL THEN 1 ELSE 0 END) as con_errores
      FROM recordatorios
    `).get();

    return NextResponse.json({
      success: true,
      diagnostico: {
        configuracion: {
          proveedor_activo: proveedorActivo,
          greenapi_instance_id: config['greenapi_instance_id'] || '❌ No configurado',
          greenapi_token: config['greenapi_token'] || '❌ No configurado',
          ultramsg_instance_id: config['ultramsg_instance_id'] || '❌ No configurado',
          ultramsg_token: config['ultramsg_token'] || '❌ No configurado',
          test_mode: testMode ? '⚠️ ACTIVO (mensajes simulados)' : '✅ Desactivado (mensajes reales)',
          webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rodrigoulloakine.netlify.app'}/api/webhook/whatsapp`
        },
        estadisticas: {
          total_recordatorios: stats.total_recordatorios || 0,
          con_respuesta: stats.con_respuesta || 0,
          confirmados: stats.confirmados || 0,
          cancelados: stats.cancelados || 0,
          confirmaciones_enviadas: stats.confirmaciones_enviadas || 0,
          con_errores: stats.con_errores || 0,
          tasa_respuesta: stats.total_recordatorios > 0 
            ? `${((stats.con_respuesta / stats.total_recordatorios) * 100).toFixed(1)}%` 
            : '0%',
          tasa_confirmacion_enviada: stats.con_respuesta > 0
            ? `${((stats.confirmaciones_enviadas / stats.con_respuesta) * 100).toFixed(1)}%`
            : '0%'
        },
        ultimos_recordatorios: ultimosRecordatorios.map((r: any) => ({
          id: r.id,
          cita_id: r.cita_id,
          paciente: r.paciente_nombre,
          telefono: r.telefono,
          fecha_cita: r.fecha,
          hora_cita: r.hora,
          enviado: r.enviado_at,
          respuesta: r.respuesta || 'Sin respuesta',
          respuesta_at: r.respuesta_at || null,
          confirmacion_enviada: r.mensaje_respuesta_enviado === 1 ? '✅ Sí' : '❌ No',
          error: r.error_respuesta || null,
          estado_cita: r.cita_estado
        })),
        recordatorios_sin_confirmacion: recordatoriosSinConfirmacion.map((r: any) => ({
          id: r.id,
          cita_id: r.cita_id,
          paciente: r.paciente_nombre,
          telefono: r.telefono,
          respuesta: r.respuesta,
          respuesta_at: r.respuesta_at,
          error: r.error_respuesta || 'Sin error registrado'
        })),
        numeros_telefono: pacientesConTelefono.map((p: any) => ({
          paciente_id: p.id,
          nombre: p.nombre,
          telefono_original: p.telefono,
          longitud_limpia: p.longitud_limpia,
          formato_valido: p.longitud_limpia >= 8 && p.longitud_limpia <= 12 ? '✅' : '⚠️',
          formato_esperado: p.telefono.replace(/\D/g, '').startsWith('56') 
            ? '✅ Con código país' 
            : '⚠️ Sin código país (se agregará 56)'
        })),
        recomendaciones: []
      }
    });

  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Reenviar confirmación manualmente
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { recordatorioId } = await request.json();

    if (!recordatorioId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere recordatorioId' },
        { status: 400 }
      );
    }

    // Obtener información del recordatorio
    const recordatorio: any = await db.prepare(`
      SELECT 
        r.id,
        r.cita_id,
        r.respuesta,
        c.fecha,
        c.hora,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM recordatorios r
      LEFT JOIN citas c ON r.cita_id = c.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE r.id = ?
    `).get(recordatorioId);

    if (!recordatorio) {
      return NextResponse.json(
        { success: false, error: 'Recordatorio no encontrado' },
        { status: 404 }
      );
    }

    if (!recordatorio.respuesta) {
      return NextResponse.json(
        { success: false, error: 'El recordatorio no tiene respuesta del paciente' },
        { status: 400 }
      );
    }

    // Importar funciones de WhatsApp
    const { sendWhatsAppMessage, formatearMensajeConfirmacion } = await import('@/lib/whatsapp');

    // Formatear y enviar mensaje según el tipo de respuesta
    let mensaje = '';
    if (recordatorio.respuesta === 'CONFIRMAR') {
      mensaje = await formatearMensajeConfirmacion({
        paciente: recordatorio.paciente_nombre,
        fecha: recordatorio.fecha,
        hora: recordatorio.hora
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden reenviar confirmaciones' },
        { status: 400 }
      );
    }

    // Enviar mensaje
    const resultado = await sendWhatsAppMessage({
      phone: recordatorio.paciente_telefono,
      message: mensaje
    });

    // Actualizar registro
    await db.prepare(`
      UPDATE recordatorios 
      SET mensaje_respuesta_id = ?, 
          mensaje_respuesta_enviado = 1,
          error_respuesta = NULL
      WHERE id = ?
    `).run(resultado.idMessage, recordatorioId);

    return NextResponse.json({
      success: true,
      message: 'Confirmación reenviada exitosamente',
      whatsappMessageId: resultado.idMessage
    });

  } catch (error: any) {
    console.error('Error al reenviar confirmación:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
