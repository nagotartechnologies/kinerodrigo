import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
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
  try {
    console.log('Consultando respuestas de botones en Green API...');

    // Se leen primero desde la BD y si no existen se usan las variables de entorno como fallback
    const instanceId = await getConfig('greenapi_instance_id', process.env.GREEN_API_INSTANCE_ID || '');
    const apiToken = await getConfig('greenapi_token', process.env.GREEN_API_TOKEN || '');

    console.log('Instance ID:', instanceId ? `${instanceId.substring(0, 4)}...` : 'NO CONFIGURADO');
    console.log('API Token:', apiToken ? `${apiToken.substring(0, 8)}...` : 'NO CONFIGURADO');

    if (!instanceId || !apiToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciales de Green API no configuradas' 
      }, { status: 400 });
    }

    // Se consulta la cola de notificaciones de Green API. Incluye mensajes de texto y respuestas de botones.
    const url = `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${apiToken}`;
    
    console.log('Consultando notificaciones pendientes...');
    console.log('URL:', url.replace(apiToken, '***'));
    
    // Se procesan hasta 10 notificaciones por llamada para no saturar la respuesta
    const allMessages = [];
    for (let i = 0; i < 10; i++) {
      console.log(`Obteniendo notificacion ${i + 1}/10...`);
      const response = await fetch(url);
      
      console.log(`Respuesta de Green API: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Error al consultar Green API: ${response.statusText}`);
        console.log(`Detalle del error:`, errorText);
        break;
      }

      const notification = await response.json();
      console.log('Notificacion recibida:', JSON.stringify(notification, null, 2));
      
      // Si receiptId es null la cola esta vacia, se puede salir del loop
      if (!notification || notification.receiptId === null || notification.receiptId === undefined) {
        console.log('No hay mas notificaciones pendientes.');
        break;
      }

      console.log('Notificacion valida con receiptId:', notification.receiptId);
      allMessages.push(notification);

      // Cada notificacion debe eliminarse de la cola tras procesarla
      const deleteUrl = `https://api.green-api.com/waInstance${instanceId}/deleteNotification/${apiToken}/${notification.receiptId}`;
      await fetch(deleteUrl, { method: 'DELETE' });
      console.log(`Notificacion ${notification.receiptId} eliminada de la cola.`);
    }

    console.log(`Total de notificaciones procesadas: ${allMessages.length}`);

    let procesados = 0;
    let errores = 0;

    // Se itera sobre cada notificacion recibida para procesar su tipo y extraer la respuesta
    for (const notification of allMessages) {
      const msg = notification.body;
      try {
          console.log('Procesando mensaje:', JSON.stringify(msg, null, 2));
        
        // Se extraen los campos principales del cuerpo del mensaje
        const typeMessage = msg.typeMessage;
        const senderData = msg.senderData;
        const messageData = msg.messageData;

        console.log('typeMessage:', typeMessage);
        console.log('senderData:', senderData);
        console.log('messageData keys:', messageData ? Object.keys(messageData) : 'null');

        if (!senderData || !messageData) {
          console.log('Mensaje sin senderData o messageData, se omite.');
          continue;
        }

        const phone = senderData.chatId?.replace('@c.us', '') || senderData.sender?.replace('@c.us', '') || '';
        console.log('Telefono extraido:', phone);
        
        let messageText = '';
        
        // Procesar según tipo de mensaje
        if (typeMessage === 'textMessage') {
          messageText = messageData.textMessageData?.textMessage?.toLowerCase().trim() || '';
          console.log('Mensaje de texto recibido:', messageText);
        } else if (typeMessage === 'buttonsResponseMessage') {
          console.log('Respuesta de boton detectada.');
          console.log('messageData completo:', JSON.stringify(messageData, null, 2));
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

        console.log(`Respuesta valida de ${phone}: "${messageText}"`);

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
          console.log(`No hay recordatorio pendiente para ${phone}.`);
          continue;
        }

        console.log(`Recordatorio encontrado para cita #${recordatorio.cita_id}.`);

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

          console.log(`Mensaje de ${respuesta} enviado a ${recordatorio.paciente_nombre}.`);
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
