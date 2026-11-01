import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { 
  sendWhatsAppMessage, 
  formatearMensajeConfirmacion, 
  formatearMensajeCancelacion,
  formatearMensajeReagendamiento 
} from '@/lib/whatsapp';

async function getConfig(clave: string, defaultValue: string = ''): Promise<string> {
  try {
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
    return config?.valor || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

// GET - Consulta la cola de notificaciones de Green API y procesa las respuestas de los pacientes
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    // Se leen primero desde la BD y si no existen se usan las variables de entorno como fallback
    const instanceId = await getConfig('greenapi_instance_id', process.env.GREEN_API_INSTANCE_ID || '');
    const apiToken = await getConfig('greenapi_token', process.env.GREEN_API_TOKEN || '');

    if (!instanceId || !apiToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciales de Green API no configuradas' 
      }, { status: 400 });
    }

    // Se consulta la cola de notificaciones de Green API. Incluye mensajes de texto y respuestas de botones.
    const url = `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${apiToken}`;
    
    // Se procesan hasta 10 notificaciones por llamada para no saturar la respuesta
    const allMessages = [];
    for (let i = 0; i < 10; i++) {
      const response = await fetch(url);
      
      if (!response.ok) {
        break;
      }

      const notification = await response.json();
      
      // Si receiptId es null la cola esta vacia, se puede salir del loop
      if (!notification || notification.receiptId === null || notification.receiptId === undefined) {
        break;
      }

      allMessages.push(notification);

      // Cada notificacion debe eliminarse de la cola tras procesarla
      const deleteUrl = `https://api.green-api.com/waInstance${instanceId}/deleteNotification/${apiToken}/${notification.receiptId}`;
      await fetch(deleteUrl, { method: 'DELETE' });
    }

    let procesados = 0;
    let errores = 0;

    // Se itera sobre cada notificacion recibida para procesar su tipo y extraer la respuesta
    for (const notification of allMessages) {
      const msg = notification.body;
      try {
        // Se extraen los campos principales del cuerpo del mensaje
        const typeMessage = msg.typeMessage;
        const senderData = msg.senderData;
        const messageData = msg.messageData;

        if (!senderData || !messageData) {
          continue;
        }

        const phone = senderData.chatId?.replace('@c.us', '') || senderData.sender?.replace('@c.us', '') || '';
        
        let messageText = '';
        
        // Procesar según tipo de mensaje
        if (typeMessage === 'textMessage') {
          messageText = messageData.textMessageData?.textMessage?.toLowerCase().trim() || '';
        } else if (typeMessage === 'buttonsResponseMessage') {
          const buttonId = messageData.buttonsResponseMessage?.selectedButtonId || '';
          const buttonText = messageData.buttonsResponseMessage?.selectedButtonText || '';
          
            // Se normaliza el ID o texto del boton a una accion reconocida
          if (buttonId === '1' || buttonText.toLowerCase().includes('confirmar')) {
            messageText = 'confirmar';
          } else if (buttonId === '2' || buttonText.toLowerCase().includes('cancelar')) {
            messageText = 'cancelar';
          } else if (buttonId === '3' || buttonText.toLowerCase().includes('reagendar')) {
            messageText = 'reagendar';
          }
        }

        if (!messageText) continue;

        // Verificar si es una respuesta válida
        const esRespuestaValida = 
          messageText.includes('confirmar') || 
          messageText.includes('cancelar') || 
          messageText.includes('reagendar') ||
          messageText === '1' || 
          messageText === '2' || 
          messageText === '3';

        if (!esRespuestaValida) continue;

        // Se busca el recordatorio mas reciente enviado a ese numero que aun no tenga respuesta
        const phoneClean = phone.replace(/\D/g, '');
        const phoneLast8 = phoneClean.slice(-8);

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
          continue;
        }

        // Se determina la accion (CONFIRMAR/CANCELAR/REAGENDAR) y se actualiza la cita
        let respuesta = '';
        let mensajeRespuesta = '';

        if (messageText.includes('confirmar') || messageText === '1') {
          respuesta = 'CONFIRMAR';
          await db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run('confirmada', recordatorio.cita_id);
          mensajeRespuesta = await formatearMensajeConfirmacion({
            paciente: recordatorio.paciente_nombre,
            fecha: recordatorio.fecha,
            hora: recordatorio.hora
          });
        } else if (messageText.includes('cancelar') || messageText === '2') {
          respuesta = 'CANCELAR';
          await db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run('cancelada', recordatorio.cita_id);
          mensajeRespuesta = await formatearMensajeCancelacion({
            paciente: recordatorio.paciente_nombre
          });
        } else if (messageText.includes('reagendar') || messageText === '3') {
          respuesta = 'REAGENDAR';
          mensajeRespuesta = await formatearMensajeReagendamiento();
        }

        // Se guarda la respuesta en el registro del recordatorio para trazabilidad
        if (respuesta !== 'REAGENDAR') {
          await db.prepare(`
            UPDATE recordatorios 
            SET respuesta = ?, respuesta_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(respuesta, recordatorio.recordatorio_id);
        }

        // Se confirma la accion al paciente enviandole un mensaje de vuelta
        if (mensajeRespuesta) {
          const resultado = await sendWhatsAppMessage({
            phone: recordatorio.paciente_telefono,
            message: mensajeRespuesta
          });

          await db.prepare(`
            UPDATE recordatorios 
            SET mensaje_respuesta_id = ?, mensaje_respuesta_enviado = 1
            WHERE id = ?
          `).run(resultado.idMessage || 'enviado', recordatorio.recordatorio_id);

          procesados++;
        }

      } catch (error: any) {
        console.error('Error al procesar mensaje de WhatsApp:', error);
        errores++;
      }
    }

    return NextResponse.json({
      success: true,
      mensajes_revisados: allMessages.length,
      respuestas_procesadas: procesados,
      errores: errores,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error al verificar respuestas de WhatsApp:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al verificar respuestas' 
      },
      { status: 500 }
    );
  }
}
