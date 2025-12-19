import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { 
  sendWhatsAppMessage, 
  formatearMensajeConfirmacion, 
  formatearMensajeCancelacion,
  formatearMensajeReagendamiento 
} from '@/lib/whatsapp';

// POST - Webhook para recibir mensajes de WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📱 Webhook WhatsApp recibido:', JSON.stringify(body, null, 2));

    // Verificar que sea un mensaje de texto entrante
    if (body.typeWebhook !== 'incomingMessageReceived') {
      console.log(`⚠️ Tipo de webhook no procesado: ${body.typeWebhook}`);
      return NextResponse.json({ success: true, message: 'Tipo de webhook no procesado' });
    }

    const messageData = body.messageData;
    if (!messageData) {
      console.log('⚠️ No hay messageData en el webhook');
      return NextResponse.json({ success: true, message: 'No hay messageData' });
    }

    // Extraer información del mensaje
    const senderData = body.senderData;
    if (!senderData) {
      console.log('⚠️ No hay senderData en el webhook');
      return NextResponse.json({ success: true, message: 'No hay senderData' });
    }
    
    const phone = senderData.chatId?.replace('@c.us', '') || senderData.sender?.replace('@c.us', '') || '';
    
    // Extraer texto del mensaje (puede ser textMessage o quotedMessage)
    let messageText = '';
    if (messageData.typeMessage === 'textMessage') {
      messageText = messageData.textMessageData?.textMessage?.toLowerCase().trim() || '';
    } else if (messageData.typeMessage === 'quotedMessage') {
      messageText = messageData.extendedTextMessageData?.text?.toLowerCase().trim() || '';
    } else {
      console.log(`⚠️ Tipo de mensaje no soportado: ${messageData.typeMessage}`);
      return NextResponse.json({ success: true, message: 'Tipo de mensaje no soportado' });
    }
    
    console.log(`📞 Mensaje de ${phone}: "${messageText}"`);
    
    if (!messageText) {
      console.log('⚠️ Mensaje vacío');
      return NextResponse.json({ success: true, message: 'Mensaje vacío' });
    }

    // Buscar recordatorio pendiente para este teléfono
    // Limpiar número de teléfono (solo dígitos)
    const phoneClean = phone.replace(/\D/g, '');
    const phoneLast8 = phoneClean.slice(-8);
    
    console.log(`🔍 Buscando recordatorio para teléfono: ${phone} (últimos 8: ${phoneLast8})`);
    
    const recordatorio: any = await db.prepare(`
      SELECT 
        r.id as recordatorio_id,
        r.cita_id,
        c.id as cita_id,
        c.fecha,
        c.hora,
        c.estado,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM recordatorios r
      INNER JOIN citas c ON r.cita_id = c.id
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE (r.telefono LIKE ? OR r.telefono LIKE ? OR r.telefono LIKE ?)
        AND r.estado = 'enviado'
        AND r.respuesta IS NULL
      ORDER BY r.enviado_at DESC
      LIMIT 1
    `).get(`%${phoneLast8}%`, `%${phoneClean}%`, `%${phone}%`);

    if (!recordatorio) {
      console.log('❌ No se encontró recordatorio pendiente para este teléfono');
      console.log('💡 Tip: Verifica que el recordatorio se haya enviado y que el número coincida');
      
      // Mostrar recordatorios recientes para debug
      const recordatoriosRecientes = await db.prepare(`
        SELECT r.telefono, r.estado, r.enviado_at, r.respuesta
        FROM recordatorios r
        ORDER BY r.enviado_at DESC
        LIMIT 5
      `).all();
      console.log('📋 Últimos 5 recordatorios:', recordatoriosRecientes);
      
      return NextResponse.json({ success: true, message: 'No hay recordatorio pendiente' });
    }

    console.log(`✅ Recordatorio encontrado para cita #${recordatorio.cita_id}`);

    let respuesta = '';
    let nuevoEstado = recordatorio.estado;
    let mensajeRespuesta = '';

    // Procesar respuesta del paciente
    if (messageText.includes('confirmar') || messageText === '1') {
      // CONFIRMAR CITA
      respuesta = 'CONFIRMAR';
      nuevoEstado = 'confirmada';
      
      await db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run('confirmada', recordatorio.cita_id);
      
      mensajeRespuesta = await formatearMensajeConfirmacion({
        paciente: recordatorio.paciente_nombre,
        fecha: recordatorio.fecha,
        hora: recordatorio.hora
      });
      
      console.log(`✅ Cita #${recordatorio.cita_id} CONFIRMADA`);

    } else if (messageText.includes('cancelar') || messageText === '2') {
      // CANCELAR CITA
      respuesta = 'CANCELAR';
      nuevoEstado = 'cancelada';
      
      await db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run('cancelada', recordatorio.cita_id);
      
      mensajeRespuesta = await formatearMensajeCancelacion({
        paciente: recordatorio.paciente_nombre
      });
      
      console.log(`❌ Cita #${recordatorio.cita_id} CANCELADA`);

    } else if (messageText.includes('reagendar') || messageText === '3') {
      // REAGENDAR CITA
      respuesta = 'REAGENDAR';
      
      mensajeRespuesta = await formatearMensajeReagendamiento();
      
      console.log(`📅 Solicitud de reagendamiento para cita #${recordatorio.cita_id}`);
      
      // Para reagendamiento, NO marcamos el recordatorio como respondido
      // para que el paciente pueda confirmar o cancelar después
      // Solo enviamos el mensaje informativo

    } else {
      // Respuesta no reconocida
      console.log('⚠️ Respuesta no reconocida');
      return NextResponse.json({ success: true, message: 'Respuesta no reconocida' });
    }

    // Actualizar recordatorio con la respuesta (excepto para REAGENDAR)
    if (respuesta !== 'REAGENDAR') {
      await db.prepare(`
        UPDATE recordatorios 
        SET respuesta = ?, respuesta_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(respuesta, recordatorio.recordatorio_id);
    }

    // Enviar mensaje de respuesta al paciente
    if (mensajeRespuesta) {
      console.log(`📤 Enviando mensaje de respuesta a ${recordatorio.paciente_telefono}`);
      console.log(`📝 Mensaje: ${mensajeRespuesta}`);
      console.log(`🔧 Acción detectada: ${respuesta}`);
      
      try {
        const resultado = await sendWhatsAppMessage({
          phone: recordatorio.paciente_telefono,
          message: mensajeRespuesta
        });
        console.log('✅ Mensaje de respuesta enviado exitosamente:', resultado);
        
        // Registrar el envío exitoso
        await db.prepare(`
          UPDATE recordatorios 
          SET mensaje_respuesta_id = ?, mensaje_respuesta_enviado = 1
          WHERE id = ?
        `).run(resultado.idMessage || 'enviado', recordatorio.recordatorio_id);
        
      } catch (error: any) {
        console.error('❌ Error al enviar mensaje de respuesta:', error);
        console.error('❌ Detalles del error:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Registrar el error en la base de datos
        await db.prepare(`
          UPDATE recordatorios 
          SET error_respuesta = ?
          WHERE id = ?
        `).run(error.message, recordatorio.recordatorio_id);
      }
    } else {
      console.log('⚠️ No hay mensaje de respuesta para enviar');
      console.log('⚠️ Respuesta detectada:', respuesta);
      console.log('⚠️ Mensaje generado:', mensajeRespuesta);
    }

    return NextResponse.json({
      success: true,
      message: 'Respuesta procesada exitosamente',
      accion: respuesta,
      citaId: recordatorio.cita_id
    });

  } catch (error: any) {
    console.error('❌ Error en webhook WhatsApp:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al procesar webhook' 
      },
      { status: 500 }
    );
  }
}

// GET - Verificar estado del webhook
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook de WhatsApp activo',
    timestamp: new Date().toISOString()
  });
}
