import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { estadoCronRecordatorios } from '@/lib/cron';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar estado del cron
    const estadoCron = estadoCronRecordatorios();

    // 2. Verificar configuraciones
    const configs = await db.prepare(`
      SELECT clave, valor 
      FROM configuraciones 
      WHERE clave IN (
        'recordatorios_automaticos',
        'whatsapp_activo',
        'recordatorios_horas_antes',
        'whatsapp_instance_id',
        'whatsapp_api_token'
      )
    `).all();

    const configuraciones: any = {};
    configs.forEach((c: any) => {
      configuraciones[c.clave] = c.valor;
    });

    // 3. Verificar citas próximas (24 horas)
    const ahora = new Date();
    const fechaLimite = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

    const citasProximas = await db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.fecha = ?
        AND c.estado IN ('pendiente', 'confirmada')
        AND p.activo = 1
      ORDER BY c.hora ASC
    `).all(fechaLimiteStr);

    // 4. Verificar recordatorios enviados hoy
    const recordatoriosHoy = await db.prepare(`
      SELECT 
        r.id,
        r.cita_id,
        r.estado,
        r.enviado_at,
        c.fecha as cita_fecha,
        c.hora as cita_hora,
        p.nombre as paciente_nombre
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE DATE(r.enviado_at) = DATE('now')
      ORDER BY r.enviado_at DESC
    `).all();

    // 5. Verificar citas sin recordatorio
    const citasSinRecordatorio = await db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.fecha = ?
        AND c.estado IN ('pendiente', 'confirmada')
        AND p.activo = 1
        AND p.telefono IS NOT NULL
        AND p.telefono != ''
        AND c.id NOT IN (
          SELECT cita_id 
          FROM recordatorios 
          WHERE DATE(enviado_at) = DATE('now')
        )
      ORDER BY c.hora ASC
    `).all(fechaLimiteStr);

    // 6. Diagnóstico
    const problemas = [];
    
    if (!estadoCron.activo) {
      problemas.push('❌ El cron de recordatorios NO está activo');
    }
    
    if (configuraciones.recordatorios_automaticos === 'false') {
      problemas.push('❌ Los recordatorios automáticos están DESACTIVADOS en configuración');
    }
    
    if (configuraciones.whatsapp_activo === 'false') {
      problemas.push('❌ WhatsApp está DESACTIVADO en configuración');
    }
    
    if (!configuraciones.greenapi_instance_id || !configuraciones.greenapi_token) {
      problemas.push('❌ Faltan credenciales de Green API (Instance ID o API Token)');
    }
    
    if (citasProximas.length === 0) {
      problemas.push('⚠️ No hay citas programadas para mañana');
    }
    
    if (citasSinRecordatorio.length > 0) {
      problemas.push(`⚠️ Hay ${citasSinRecordatorio.length} cita(s) sin recordatorio enviado`);
    }

    return NextResponse.json({
      success: true,
      diagnostico: {
        cronActivo: estadoCron.activo,
        proximaEjecucion: estadoCron.proximaEjecucion,
        configuraciones,
        citasProximas: citasProximas.length,
        recordatoriosHoy: recordatoriosHoy.length,
        citasSinRecordatorio: citasSinRecordatorio.length,
        problemas,
        detalles: {
          citasProximas,
          recordatoriosHoy,
          citasSinRecordatorio
        }
      }
    });

  } catch (error: any) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
