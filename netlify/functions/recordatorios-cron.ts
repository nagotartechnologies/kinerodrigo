import { schedule } from '@netlify/functions';
import { createClient } from '@libsql/client';

// Configuración de Turso
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN son requeridos');
}

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

/**
 * Obtener valor de configuración
 */
async function getConfigValue(clave: string, defaultValue: any = ''): Promise<any> {
  try {
    const result = await db.execute({
      sql: 'SELECT valor FROM configuraciones WHERE clave = ?',
      args: [clave]
    });
    
    if (result.rows.length === 0) return defaultValue;
    
    const valor = result.rows[0].valor as string;
    
    // Convertir valores booleanos
    if (valor === 'true') return true;
    if (valor === 'false') return false;
    
    // Convertir números
    if (!isNaN(Number(valor))) return Number(valor);
    
    return valor;
  } catch (error) {
    console.error(`Error al obtener configuración ${clave}:`, error);
    return defaultValue;
  }
}

/**
 * Limpiar número de teléfono
 */
function cleanPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('56') ? cleaned : `56${cleaned}`;
}

/**
 * Enviar mensaje de WhatsApp usando el proveedor activo
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<string> {
  // Obtener proveedor activo
  const proveedorActivo = await getConfigValue('whatsapp_provider', 'greenapi');
  
  console.log(`📡 Usando proveedor: ${proveedorActivo}`);
  
  const phoneClean = cleanPhoneNumber(phone);
  
  // ULTRAMSG
  if (proveedorActivo === 'ultramsg') {
    const instanceId = await getConfigValue('ultramsg_instance_id', '');
    const token = await getConfigValue('ultramsg_token', '');
    
    if (!instanceId || !token) {
      throw new Error('Ultramsg no está configurado correctamente');
    }
    
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    const formData = new URLSearchParams();
    formData.append('token', token);
    formData.append('to', phoneClean);
    formData.append('body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje con Ultramsg: ${error}`);
    }
    
    const result = await response.json();
    return result.id || `ULTRAMSG_${Date.now()}`;
  }
  
  // GREEN API
  else if (proveedorActivo === 'greenapi') {
    const instanceId = await getConfigValue('greenapi_instance_id', '');
    const apiToken = await getConfigValue('greenapi_token', '');
    
    if (!instanceId || !apiToken) {
      throw new Error('Green API no está configurado correctamente');
    }
    
    const chatId = `${phoneClean}@c.us`;
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje con Green API: ${error}`);
    }
    
    const result = await response.json();
    return result.idMessage || `GREENAPI_${Date.now()}`;
  }
  
  // TWILIO
  else if (proveedorActivo === 'twilio') {
    const accountSid = await getConfigValue('twilio_account_sid', '');
    const authToken = await getConfigValue('twilio_auth_token', '');
    const whatsappNumber = await getConfigValue('twilio_whatsapp_number', '');
    
    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error('Twilio no está configurado correctamente');
    }
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${whatsappNumber}`);
    formData.append('To', `whatsapp:+${phoneClean}`);
    formData.append('Body', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje con Twilio: ${error}`);
    }
    
    const result = await response.json();
    return result.sid || `TWILIO_${Date.now()}`;
  }
  
  // Proveedor no soportado
  else {
    throw new Error(`Proveedor no soportado: ${proveedorActivo}`);
  }
}

/**
 * Formatear mensaje de recordatorio
 */
async function formatearMensajeRecordatorio(cita: {
  paciente: string;
  fecha: string;
  hora: string;
  tipo: string;
  duracion: number;
}): Promise<string> {
  const [year, month, day] = cita.fecha.split('-');
  const fechaFormateada = `${day}/${month}/${year}`;

  const nombreCentro = await getConfigValue('nombre_centro', 'NAGO-KINE');
  const plantilla = await getConfigValue('whatsapp_mensaje_recordatorio', 
    '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente},\n\nTe recordamos tu cita programada:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} minutos\n📋 *Tipo:* {tipo}\n\nPor favor, responde con una de las siguientes opciones:\n\n1️⃣ *CONFIRMAR* - Para confirmar tu asistencia\n2️⃣ *CANCELAR* - Para cancelar la cita\n3️⃣ *REAGENDAR* - Para cambiar la fecha/hora\n\n¡Te esperamos! 💪'
  );

  let resultado = plantilla;
  const variables: Record<string, string> = {
    nombre_centro: nombreCentro,
    paciente: cita.paciente,
    fecha: fechaFormateada,
    hora: cita.hora,
    duracion: String(cita.duracion),
    tipo: cita.tipo
  };

  for (const [key, value] of Object.entries(variables)) {
    resultado = resultado.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return resultado;
}

/**
 * Enviar recordatorios automáticos
 */
async function enviarRecordatoriosAutomaticos() {
  try {
    console.log('🔔 [NETLIFY CRON] Verificando citas para enviar recordatorios automáticos...');
    
    // Verificar si los recordatorios automáticos están activados
    const recordatoriosActivos = await getConfigValue('recordatorios_automaticos', true);
    if (!recordatoriosActivos) {
      console.log('⏸️  [NETLIFY CRON] Recordatorios automáticos desactivados en configuración');
      return { message: 'Recordatorios desactivados', enviados: 0 };
    }

    // Verificar si WhatsApp está activo
    const whatsappActivo = await getConfigValue('whatsapp_activo', true);
    if (!whatsappActivo) {
      console.log('⏸️  [NETLIFY CRON] WhatsApp desactivado en configuración');
      return { message: 'WhatsApp desactivado', enviados: 0 };
    }

    // Obtener horas antes para enviar recordatorio
    const horasAntes = await getConfigValue('recordatorios_horas_antes', 24);
    
    // Calcular fecha límite (ahora + horasAntes)
    const ahora = new Date();
    const fechaLimite = new Date(ahora.getTime() + (horasAntes * 60 * 60 * 1000));
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    console.log(`📅 [NETLIFY CRON] Buscando citas para el ${fechaLimiteStr} (${horasAntes}h antes)`);

    // Buscar citas próximas que aún no tienen recordatorio enviado
    const citasResult = await db.execute({
      sql: `
        SELECT 
          c.id,
          c.fecha,
          c.hora,
          c.duracion,
          c.tipo,
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
      `,
      args: [fechaLimiteStr]
    });

    const citas = citasResult.rows;

    if (citas.length === 0) {
      console.log('✅ [NETLIFY CRON] No hay citas pendientes de recordatorio');
      return { message: 'No hay citas pendientes', enviados: 0 };
    }

    console.log(`📨 [NETLIFY CRON] Encontradas ${citas.length} cita(s) para enviar recordatorio`);

    let enviados = 0;
    let errores = 0;

    for (const cita of citas) {
      try {
        console.log(`📤 [NETLIFY CRON] Enviando recordatorio para cita #${cita.id} - ${cita.paciente_nombre}`);

        // Formatear mensaje
        const mensaje = await formatearMensajeRecordatorio({
          paciente: cita.paciente_nombre as string,
          fecha: cita.fecha as string,
          hora: cita.hora as string,
          tipo: cita.tipo as string,
          duracion: cita.duracion as number
        });

        // Enviar mensaje por WhatsApp
        const messageId = await sendWhatsAppMessage(
          cita.paciente_telefono as string,
          mensaje
        );

        // Registrar el envío en la base de datos
        await db.execute({
          sql: `
            INSERT INTO recordatorios (
              cita_id,
              mensaje_id,
              telefono,
              mensaje,
              estado,
              enviado_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          args: [
            cita.id,
            messageId,
            cita.paciente_telefono,
            mensaje,
            'enviado'
          ]
        });

        enviados++;
        console.log(`✅ [NETLIFY CRON] Recordatorio enviado exitosamente para cita #${cita.id}`);

        // Esperar 2 segundos entre mensajes
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        errores++;
        console.error(`❌ [NETLIFY CRON] Error al enviar recordatorio para cita #${cita.id}:`, error.message);
      }
    }

    console.log(`📊 [NETLIFY CRON] Resumen: ${enviados} enviados, ${errores} errores`);
    
    return {
      message: 'Recordatorios procesados',
      enviados,
      errores,
      total: citas.length
    };

  } catch (error: any) {
    console.error('❌ [NETLIFY CRON] Error en proceso de recordatorios automáticos:', error);
    throw error;
  }
}

// Función programada que se ejecuta cada 2 horas
export const handler = schedule('0 */2 * * *', async (event) => {
  console.log('🚀 [NETLIFY CRON] Iniciando ejecución programada de recordatorios');
  console.log('⏰ Hora de ejecución:', new Date().toISOString());
  
  try {
    const resultado = await enviarRecordatoriosAutomaticos();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...resultado
      })
    };
  } catch (error: any) {
    console.error('❌ [NETLIFY CRON] Error fatal:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
});
