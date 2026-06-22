import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// POST - Endpoint interno para enviar mensaje de respuesta al paciente
// Se llama desde el webhook principal para no bloquear la respuesta al webhook
export async function POST(request: NextRequest) {
  let recordatorioId: number | null = null;
  
  try {
    const body = await request.json();
    const { telefono, mensaje } = body;
    recordatorioId = body.recordatorioId || null;

    if (!telefono || !mensaje) {
      return NextResponse.json({ success: false, error: 'Faltan datos' }, { status: 400 });
    }

    const resultado = await sendWhatsAppMessage({
      phone: telefono,
      message: mensaje
    });

    console.log('✅ Respuesta enviada:', resultado.idMessage);

    if (recordatorioId) {
      await db.prepare(`
        UPDATE recordatorios 
        SET mensaje_respuesta_id = ?, mensaje_respuesta_enviado = 1, error_respuesta = NULL
        WHERE id = ?
      `).run(resultado.idMessage || 'enviado', recordatorioId);
    }

    return NextResponse.json({ success: true, idMessage: resultado.idMessage });
  } catch (error: any) {
    console.error('❌ Error enviando respuesta:', error.message);

    // Guardar error en BD para poder reintentar después
    if (recordatorioId) {
      try {
        await db.prepare(`
          UPDATE recordatorios 
          SET error_respuesta = ?, mensaje_respuesta_enviado = 0
          WHERE id = ?
        `).run(error.message, recordatorioId);
      } catch { /* ignorar error secundario */ }
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Reintentar envío de mensajes de respuesta fallidos
export async function GET(request: NextRequest) {
  try {
    // Buscar recordatorios con respuesta pero sin mensaje enviado (fallidos)
    const pendientes: any[] = await db.prepare(`
      SELECT 
        r.id, r.cita_id, r.respuesta, r.error_respuesta,
        p.nombre as paciente_nombre, p.telefono as paciente_telefono,
        c.fecha, c.hora
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE r.respuesta IS NOT NULL
        AND r.mensaje_respuesta_enviado = 0
        AND datetime(r.respuesta_at) >= datetime('now', '-24 hours')
      ORDER BY r.respuesta_at DESC
      LIMIT 10
    `).all();

    if (pendientes.length === 0) {
      return NextResponse.json({ success: true, message: 'No hay mensajes pendientes', reintentos: 0 });
    }

    let exitosos = 0;
    let fallidos = 0;

    for (const rec of pendientes) {
      try {
        // Importar dinámicamente las funciones de formato
        const { formatearMensajeConfirmacion, formatearMensajeCancelacion, formatearMensajeReagendamiento } = await import('@/lib/whatsapp');
        
        let mensaje = '';
        if (rec.respuesta === 'CONFIRMAR') {
          mensaje = await formatearMensajeConfirmacion({ paciente: rec.paciente_nombre, fecha: rec.fecha, hora: rec.hora });
        } else if (rec.respuesta === 'CANCELAR') {
          mensaje = await formatearMensajeCancelacion({ paciente: rec.paciente_nombre });
        } else if (rec.respuesta === 'REAGENDAR') {
          mensaje = await formatearMensajeReagendamiento();
        }

        if (!mensaje) continue;

        const resultado = await sendWhatsAppMessage({ phone: rec.paciente_telefono, message: mensaje });

        await db.prepare(`
          UPDATE recordatorios 
          SET mensaje_respuesta_id = ?, mensaje_respuesta_enviado = 1, error_respuesta = NULL
          WHERE id = ?
        `).run(resultado.idMessage || 'reintento', rec.id);

        exitosos++;
      } catch (err: any) {
        await db.prepare(`
          UPDATE recordatorios SET error_respuesta = ? WHERE id = ?
        `).run(err.message, rec.id);
        fallidos++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reintentos: ${exitosos} exitosos, ${fallidos} fallidos`,
      reintentos: exitosos,
      fallidos,
      total: pendientes.length
    });
  } catch (error: any) {
    console.error('❌ Error en reintentos:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
