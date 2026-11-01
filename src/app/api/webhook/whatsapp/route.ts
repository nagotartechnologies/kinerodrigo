import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { timingSafeEqual } from 'crypto';
import { 
  sendWhatsAppMessage,
  formatearMensajeConfirmacion, 
  formatearMensajeCancelacion,
  formatearMensajeReagendamiento,
  notificarProfesional
} from '@/lib/whatsapp';
import { detectarIntencion } from '@/lib/whatsapp/detectarIntencion';
import { horasHastaCita } from '@/lib/horaChile';

// Estados de cita sobre los que el paciente todavía puede responder
const ESTADOS_RESPONDIBLES = ['pendiente', 'confirmada', 'reagendar'];

/**
 * Valida el header Authorization que envía Green API cuando se configura
 * "Webhook URL Token" en la instancia. Si GREEN_API_WEBHOOK_TOKEN no está definido
 * se acepta todo (compatibilidad mientras se configura).
 */
function webhookAutorizado(request: NextRequest): boolean {
  const token = process.env.GREEN_API_WEBHOOK_TOKEN;
  if (!token) return true;
  const esperado = /^(Bearer|Basic) /.test(token) ? token : `Bearer ${token}`;
  const recibido = request.headers.get('authorization') || '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function getConfig(clave: string, defaultValue: string): Promise<string> {
  const fila: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
  return fila?.valor ?? defaultValue;
}

// POST - Webhook para recibir mensajes de WhatsApp
// Procesa respuestas a recordatorios usando sistema de scoring por intención
// Si no reconoce la respuesta, envía un re-prompt al paciente (una sola vez)
export async function POST(request: NextRequest) {
  if (!webhookAutorizado(request)) {
    console.warn('🚫 Webhook rechazado: Authorization inválido');
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  let idMessage = '';
  let idRegistrado = false;

  try {
    const body = await request.json();

    // Detectar formato del webhook
    let phone = '';
    let messageText = '';
    let quotedMessageId = '';
    let esReaccion = false;
    let reaccionEmoji = '';
    
    // FORMATO ULTRAMSG
    if (body.data && body.data.from) {
      // Ignorar mensajes enviados por nosotros mismos
      if (body.data.fromMe) {
        return NextResponse.json({ success: true, message: 'Mensaje propio ignorado' });
      }
      phone = body.data.from.replace('@c.us', '').replace('@s.whatsapp.net', '');
      messageText = body.data.body || '';
      idMessage = body.data.id ? `ultramsg_${body.data.id}` : '';
    } 
    // FORMATO GREEN API
    else if (body.typeWebhook) {
      // Solo procesar mensajes ENTRANTES del paciente
      const tiposAceptados = [
        'incomingMessageReceived', 
        'incomingButtonsResponse', 
        'incomingCallback'
      ];
      
      if (!tiposAceptados.includes(body.typeWebhook)) {
        return NextResponse.json({ success: true, message: `Tipo ${body.typeWebhook} ignorado` });
      }

      const messageData = body.messageData;
      const senderData = body.senderData;
      if (!messageData || !senderData) {
        return NextResponse.json({ success: true, message: 'Datos incompletos' });
      }
      
      phone = senderData.chatId?.replace('@c.us', '') || senderData.sender?.replace('@c.us', '') || '';
      
      // ID único del mensaje para deduplicación en BD
      idMessage = body.idMessage || '';
      
      // Log detallado para diagnóstico
      console.log(`📩 Green API: type=${body.typeWebhook}, msgType=${messageData.typeMessage}, from=${phone}, idMsg=${idMessage}`);
      
      // Extraer quotedMessageId si existe (para vincular respuesta al recordatorio)
      quotedMessageId = messageData.quotedMessage?.stanzaId || 
                        messageData.extendedTextMessageData?.stanzaId || '';
      
      if (messageData.typeMessage === 'textMessage') {
        messageText = messageData.textMessageData?.textMessage || '';
      } else if (messageData.typeMessage === 'quotedMessage') {
        messageText = messageData.extendedTextMessageData?.text || '';
      } else if (messageData.typeMessage === 'buttonsResponseMessage') {
        const buttonId = messageData.buttonsResponseMessage?.selectedButtonId || '';
        const buttonText = messageData.buttonsResponseMessage?.selectedButtonText || '';
        
        if (buttonId === '1' || buttonId === 'confirmar' || buttonText.toLowerCase().includes('confirmar')) {
          messageText = 'confirmar';
        } else if (buttonId === '2' || buttonId === 'cancelar' || buttonText.toLowerCase().includes('cancelar')) {
          messageText = 'cancelar';
        } else if (buttonId === '3' || buttonId === 'reagendar' || buttonText.toLowerCase().includes('reagendar')) {
          messageText = 'reagendar';
        } else {
          messageText = buttonText;
        }
      } else if (messageData.typeMessage === 'reactionMessage') {
        // Mejora 7: Soporte para reacciones de WhatsApp
        esReaccion = true;
        reaccionEmoji = messageData.reactionMessage?.text || '';
        // Convertir reacción a texto para el scoring
        messageText = reaccionEmoji;
      } else if (
        messageData.typeMessage === 'stickerMessage' || 
        messageData.typeMessage === 'imageMessage' ||
        messageData.typeMessage === 'audioMessage' ||
        messageData.typeMessage === 'videoMessage'
      ) {
        return NextResponse.json({ success: true, message: 'Tipo de mensaje ignorado' });
      } else {
        return NextResponse.json({ success: true, message: 'Tipo no soportado' });
      }
    } else {
      return NextResponse.json({ success: true, message: 'Formato desconocido' });
    }
    
    // Limpiar messageText
    messageText = messageText.trim();
    
    if (!messageText) {
      return NextResponse.json({ success: true, message: 'Mensaje vacío' });
    }
    
    console.log(`📱 De ${phone}: "${messageText}" (idMsg: ${idMessage || 'N/A'})`);

    // Idempotencia: el proveedor reintenta los webhooks, cada mensaje se procesa una sola vez
    if (idMessage) {
      const { changes } = await db.prepare('INSERT OR IGNORE INTO webhook_mensajes (id_message) VALUES (?)').run(idMessage);
      if (!changes) {
        console.log(`🔁 Mensaje ${idMessage} ya procesado, se ignora`);
        return NextResponse.json({ success: true, message: 'Mensaje duplicado' });
      }
      idRegistrado = true;
    }

    // Buscar recordatorio pendiente para este teléfono
    const phoneClean = phone.replace(/\D/g, '');
    const phoneLast8 = phoneClean.slice(-8);

    // Mejora 6: Si hay quotedMessageId, buscar por mensaje_id directamente
    let recordatorio: any = null;
    
    if (quotedMessageId) {
      recordatorio = await db.prepare(`
        SELECT 
          r.id as recordatorio_id, r.cita_id, r.enviado_at, r.mensaje_id, r.reprompts,
          c.fecha, c.hora, c.estado,
          p.nombre as paciente_nombre, p.telefono as paciente_telefono
        FROM recordatorios r
        INNER JOIN citas c ON r.cita_id = c.id
        INNER JOIN pacientes p ON c.paciente_id = p.id
        WHERE r.mensaje_id = ?
          AND r.estado = 'enviado'
          AND r.respuesta IS NULL
        LIMIT 1
      `).get(quotedMessageId);
    }
    
    // Si no se encontró por quotedMessage, buscar por teléfono + ventana de tiempo
    if (!recordatorio) {
      recordatorio = await db.prepare(`
        SELECT 
          r.id as recordatorio_id, r.cita_id, r.enviado_at, r.mensaje_id, r.reprompts,
          c.fecha, c.hora, c.estado,
          p.nombre as paciente_nombre, p.telefono as paciente_telefono
        FROM recordatorios r
        INNER JOIN citas c ON r.cita_id = c.id
        INNER JOIN pacientes p ON c.paciente_id = p.id
        WHERE (REPLACE(REPLACE(REPLACE(r.telefono, ' ', ''), '-', ''), '+', '') LIKE ? OR r.telefono LIKE ? OR r.telefono LIKE ?)
          AND r.estado = 'enviado'
          AND r.respuesta IS NULL
          AND datetime(r.enviado_at) >= datetime('now', '-48 hours')
        ORDER BY r.enviado_at DESC
        LIMIT 1
      `).get(`%${phoneLast8}%`, `%${phoneClean}%`, `%${phone}%`);
    }

    if (!recordatorio) {
      console.log(`❌ Sin recordatorio pendiente para ${phoneLast8} (phone=${phoneClean})`);
      return NextResponse.json({ 
        success: true, 
        message: 'No hay recordatorio pendiente'
      });
    }

    console.log(`✅ Recordatorio #${recordatorio.recordatorio_id} para cita #${recordatorio.cita_id} (enviado: ${recordatorio.enviado_at})`);
    
    // Mejora 2+3: Usar sistema de scoring por intención
    const resultado = detectarIntencion(messageText);
    console.log(`🧠 Intención: ${resultado.intencion} (confianza: ${resultado.confianza.toFixed(2)}, scores: C=${resultado.scoreConfirmar} X=${resultado.scoreCancelar} R=${resultado.scoreReagendar})`);

    // Si no se reconoce la intención, enviar re-prompt (una sola vez por recordatorio)
    if (resultado.intencion === 'NO_RECONOCIDO') {
      if (Number(recordatorio.reprompts || 0) > 0) {
        console.log('🤐 Re-prompt ya enviado antes, no se repite');
        return NextResponse.json({ success: true, message: 'Respuesta no reconocida, re-prompt ya enviado' });
      }

      const mensajeReprompt = '🤔 No logré entender tu respuesta.\n\nPor favor responde solo con:\n\n*1* ✅ Confirmar\n*2* ❌ Cancelar\n*3* 📅 Reagendar';
      
      try {
        await sendWhatsAppMessage({ phone: recordatorio.paciente_telefono, message: mensajeReprompt });
        console.log('📤 Re-prompt enviado');
      } catch (err: any) {
        console.error('⚠️ Error enviando re-prompt:', err.message);
      }
      await db.prepare('UPDATE recordatorios SET reprompts = COALESCE(reprompts, 0) + 1 WHERE id = ?').run(recordatorio.recordatorio_id);

      return NextResponse.json({ 
        success: true, 
        message: 'Respuesta no reconocida, re-prompt enviado'
      });
    }

    const respuesta = resultado.intencion;

    // La cita ya fue cerrada (cancelada/completada) o ya pasó: se registra la respuesta sin tocar la cita
    const horasRestantes = horasHastaCita(recordatorio.fecha, recordatorio.hora);
    if (!ESTADOS_RESPONDIBLES.includes(recordatorio.estado) || horasRestantes < 0) {
      await db.prepare(`
        UPDATE recordatorios SET respuesta = ?, respuesta_at = CURRENT_TIMESTAMP, revisado = 1 WHERE id = ?
      `).run(respuesta, recordatorio.recordatorio_id);
      console.log(`⏭️ Cita #${recordatorio.cita_id} en estado ${recordatorio.estado} (faltan ${horasRestantes.toFixed(1)}h): respuesta registrada sin cambios`);
      return NextResponse.json({ success: true, message: 'Cita no modificable, respuesta registrada' });
    }

    let mensajeRespuesta = '';
    let cancelacionTardia = false;

    if (respuesta === 'CONFIRMAR') {
      await db.prepare('UPDATE citas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('confirmada', recordatorio.cita_id);
      mensajeRespuesta = await formatearMensajeConfirmacion({
        paciente: recordatorio.paciente_nombre,
        fecha: recordatorio.fecha,
        hora: recordatorio.hora
      });
      console.log(`✅ Cita #${recordatorio.cita_id} CONFIRMADA`);
    } else if (respuesta === 'CANCELAR') {
      const horasMinimas = Number(await getConfig('cancelacion_horas_minimas', '2')) || 0;
      cancelacionTardia = horasRestantes < horasMinimas;
      await db.prepare('UPDATE citas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('cancelada', recordatorio.cita_id);
      await db.prepare(`UPDATE sesiones SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE cita_id = ?`).run(recordatorio.cita_id);
      mensajeRespuesta = await formatearMensajeCancelacion({
        paciente: recordatorio.paciente_nombre
      });
      console.log(`❌ Cita #${recordatorio.cita_id} CANCELADA${cancelacionTardia ? ' (tardía)' : ''}`);
    } else if (respuesta === 'REAGENDAR') {
      if ((await getConfig('permitir_reagendar', 'true')) !== 'false') {
        await db.prepare('UPDATE citas SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('reagendar', recordatorio.cita_id);
      }
      mensajeRespuesta = await formatearMensajeReagendamiento();
      console.log(`📅 Cita #${recordatorio.cita_id} REAGENDAR`);
    }

    // Actualizar recordatorio con la respuesta
    await db.prepare(`
      UPDATE recordatorios 
      SET respuesta = ?, respuesta_at = CURRENT_TIMESTAMP, cancelacion_tardia = ?, revisado = 0
      WHERE id = ?
    `).run(respuesta, cancelacionTardia ? 1 : 0, recordatorio.recordatorio_id);

    // Enviar mensaje de confirmación/cancelación/reagendamiento DIRECTAMENTE
    if (mensajeRespuesta) {
      try {
        const envioResult = await sendWhatsAppMessage({
          phone: recordatorio.paciente_telefono,
          message: mensajeRespuesta
        });
        console.log(`📤 Mensaje de ${respuesta} enviado: ${envioResult.idMessage}`);
        
        await db.prepare(`
          UPDATE recordatorios 
          SET mensaje_respuesta_id = ?, mensaje_respuesta_enviado = 1, error_respuesta = NULL
          WHERE id = ?
        `).run(envioResult.idMessage || 'enviado', recordatorio.recordatorio_id);
      } catch (envioError: any) {
        console.error(`❌ Error enviando mensaje de ${respuesta}:`, envioError.message);
        await db.prepare(`
          UPDATE recordatorios 
          SET mensaje_respuesta_enviado = 0, error_respuesta = ?
          WHERE id = ?
        `).run(envioError.message, recordatorio.recordatorio_id);
      }
    }

    // Avisar al profesional cuando el paciente cancela o quiere reagendar
    if (respuesta === 'CANCELAR' || respuesta === 'REAGENDAR') {
      await notificarProfesional({
        paciente: recordatorio.paciente_nombre,
        fecha: recordatorio.fecha,
        hora: recordatorio.hora,
        accion: respuesta,
        tardia: cancelacionTardia
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Respuesta procesada',
      accion: respuesta,
      citaId: recordatorio.cita_id,
      confianza: resultado.confianza
    });

  } catch (error: any) {
    console.error('❌ Error webhook:', error.message);
    // Liberar el id para que el reintento del proveedor pueda procesarlo
    if (idRegistrado) {
      await db.prepare('DELETE FROM webhook_mensajes WHERE id_message = ?').run(idMessage).catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar webhook' },
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
