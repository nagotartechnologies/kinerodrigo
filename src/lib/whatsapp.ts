// Servicio de WhatsApp usando WhatsApp Business API (Meta)
import db from './db';

// Configuración para WhatsApp Business API
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const TEST_MODE = process.env.WHATSAPP_TEST_MODE === 'true';

/**
 * Obtener configuración de WhatsApp desde la base de datos
 */
async function getConfig(clave: string, defaultValue: string = ''): Promise<string> {
  try {
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
    return config?.valor || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Obtener credenciales de WhatsApp Business API
 */
async function getWhatsAppCredentials() {
  const phoneNumberId = await getConfig('whatsapp_phone_number_id', '');
  const accessToken = await getConfig('whatsapp_access_token', '');
  
  return { phoneNumberId, accessToken };
}

/**
 * Reemplazar variables en plantilla
 */
function reemplazarVariables(plantilla: string, variables: Record<string, string>): string {
  let resultado = plantilla;
  for (const [key, value] of Object.entries(variables)) {
    resultado = resultado.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return resultado;
}

interface SendMessageParams {
  phone: string;
  message: string;
}

interface SendMessageResponse {
  idMessage: string;
}

/**
 * Enviar mensaje de texto por WhatsApp usando WhatsApp Business API
 */
export async function sendWhatsAppMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
  const { phoneNumberId, accessToken } = await getWhatsAppCredentials();
  
  // Modo de prueba (sin credenciales configuradas)
  if (TEST_MODE || !phoneNumberId || !accessToken) {
    console.log('🧪 MODO DE PRUEBA - WhatsApp Business API');
    console.log('📱 Teléfono:', phone);
    console.log('💬 Mensaje:', message);
    
    // Simular respuesta exitosa
    return {
      idMessage: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // Limpiar número de teléfono (remover espacios, guiones, etc.)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Agregar código de país si no lo tiene (Chile: 56)
  const phoneWithCountry = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;

  // URL de WhatsApp Business API
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneWithCountry,
      type: 'text',
      text: {
        body: message
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al enviar mensaje de WhatsApp: ${error}`);
  }

  const result = await response.json();
  
  // WhatsApp Business API retorna el ID del mensaje en result.messages[0].id
  return {
    idMessage: result.messages?.[0]?.id || `MSG_${Date.now()}`
  };
}

/**
 * Enviar mensaje con botones interactivos usando WhatsApp Business API
 * Nota: Los botones interactivos requieren aprobación de plantillas en WhatsApp Business
 */
export async function sendWhatsAppButtons({ phone, message, buttons }: {
  phone: string;
  message: string;
  buttons: Array<{ id: string; text: string }>;
}) {
  const { phoneNumberId, accessToken } = await getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Business API no está configurado');
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;

  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneWithCountry,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message
        },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.text.substring(0, 20) // Máximo 20 caracteres
            }
          }))
        }
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al enviar botones: ${error}`);
  }

  return await response.json();
}

/**
 * Formatear mensaje de recordatorio de cita
 */
export async function formatearMensajeRecordatorio(cita: {
  paciente: string;
  fecha: string;
  hora: string;
  tipo: string;
  duracion: number;
}): Promise<string> {
  const [year, month, day] = cita.fecha.split('-');
  const fechaFormateada = `${day}/${month}/${year}`;

  const nombreCentro = await getConfig('nombre_centro', 'NAGO-KINE');
  const plantilla = await getConfig('whatsapp_mensaje_recordatorio', 
    '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente},\n\nTe recordamos tu cita programada:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} minutos\n📋 *Tipo:* {tipo}\n\nPor favor, responde con una de las siguientes opciones:\n\n1️⃣ *CONFIRMAR* - Para confirmar tu asistencia\n2️⃣ *CANCELAR* - Para cancelar la cita\n3️⃣ *REAGENDAR* - Para cambiar la fecha/hora\n\n¡Te esperamos! 💪'
  );

  return reemplazarVariables(plantilla, {
    nombre_centro: nombreCentro,
    paciente: cita.paciente,
    fecha: fechaFormateada,
    hora: cita.hora,
    duracion: String(cita.duracion),
    tipo: cita.tipo
  });
}

/**
 * Formatear mensaje de confirmación
 */
export async function formatearMensajeConfirmacion(cita: {
  paciente: string;
  fecha: string;
  hora: string;
}): Promise<string> {
  const [year, month, day] = cita.fecha.split('-');
  const fechaFormateada = `${day}/${month}/${year}`;

  const plantilla = await getConfig('whatsapp_mensaje_confirmacion',
    '✅ *CITA CONFIRMADA*\n\nGracias {paciente}!\nTu cita ha sido confirmada para el {fecha} a las {hora}.\n\nNos vemos pronto! 🏥'
  );

  return reemplazarVariables(plantilla, {
    paciente: cita.paciente,
    fecha: fechaFormateada,
    hora: cita.hora
  });
}

/**
 * Formatear mensaje de cancelación
 */
export async function formatearMensajeCancelacion(cita: {
  paciente: string;
}): Promise<string> {
  const plantilla = await getConfig('whatsapp_mensaje_cancelacion',
    '❌ *CITA CANCELADA*\n\nHola {paciente},\nTu cita ha sido cancelada exitosamente.\n\nSi deseas agendar una nueva cita, contáctanos.\n¡Esperamos verte pronto! 🏥'
  );

  return reemplazarVariables(plantilla, {
    paciente: cita.paciente
  });
}

/**
 * Formatear mensaje de reagendamiento
 */
export async function formatearMensajeReagendamiento(): Promise<string> {
  const telefono = await getConfig('telefono_contacto', '+56 9 4888 1923');
  const plantilla = await getConfig('whatsapp_mensaje_reagendamiento',
    '📅 *REAGENDAR CITA*\n\nPara reagendar tu cita, contáctanos:\n📞 Teléfono: {telefono}\n\n¡Gracias! 🏥'
  );

  return reemplazarVariables(plantilla, {
    telefono: telefono
  });
}
