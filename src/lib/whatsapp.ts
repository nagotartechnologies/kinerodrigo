// Servicio de WhatsApp multi-proveedor
import db from './db';
import { getWhatsAppProvider } from './whatsapp/factory';
import { nombreMarca } from './marca';

/**
 * Obtener configuración de WhatsApp desde la base de datos (con cache en memoria)
 */
const configCache: Record<string, { valor: string; timestamp: number }> = {};
const CONFIG_CACHE_TTL = 300000; // 5 minutos

async function getConfig(clave: string, defaultValue: string = ''): Promise<string> {
  const cached = configCache[clave];
  if (cached && Date.now() - cached.timestamp < CONFIG_CACHE_TTL) {
    return cached.valor;
  }
  try {
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
    const valor = config?.valor || defaultValue;
    configCache[clave] = { valor, timestamp: Date.now() };
    return valor;
  } catch (error) {
    return defaultValue;
  }
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
 * Enviar mensaje de texto por WhatsApp usando el proveedor configurado
 */
export async function sendWhatsAppMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
  const provider = await getWhatsAppProvider();
  return provider.sendMessage({ phone, message });
}

/**
 * Enviar mensaje con botones interactivos por WhatsApp usando el proveedor configurado
 */
export async function sendWhatsAppMessageWithButtons({ 
  phone, 
  message, 
  buttons 
}: {
  phone: string;
  message: string;
  buttons: Array<{ buttonId: string; buttonText: string }>;
}): Promise<SendMessageResponse> {
  const provider = await getWhatsAppProvider();
  
  // Si el proveedor soporta botones, usarlos
  if (provider.sendMessageWithButtons) {
    return provider.sendMessageWithButtons({ phone, message, buttons });
  }
  
  // Fallback: enviar mensaje normal sin botones
  console.log('⚠️ Proveedor no soporta botones, enviando mensaje normal');
  return provider.sendMessage({ phone, message });
}

/**
 * Enviar archivo por WhatsApp usando el proveedor configurado
 */
export async function sendWhatsAppFile({ phone, fileUrl, caption }: {
  phone: string;
  fileUrl: string;
  caption?: string;
}) {
  const provider = await getWhatsAppProvider();
  
  if (!provider.sendFile) {
    throw new Error(`El proveedor ${provider.name} no soporta envío de archivos`);
  }
  
  return provider.sendFile({ phone, fileUrl, caption });
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

  const nombreCentro = nombreMarca(await getConfig('nombre_centro', ''));
  const plantilla = await getConfig('whatsapp_mensaje_recordatorio', 
    '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente}, te recordamos tu cita:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} min\n📋 *Tipo:* {tipo}\n\nResponde con el *número* de tu opción:\n\n*1* ✅ Confirmo asistencia\n*2* ❌ Necesito cancelar\n*3* 📅 Quiero cambiar fecha/hora\n\n¡Te esperamos! 💪'
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

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Avisar al profesional por WhatsApp cuando un paciente cancela o pide reagendar.
 * Se controla con 'notif_whatsapp' y se envía a 'notif_whatsapp_telefono'
 * (o a 'telefono_contacto' si está vacío). Nunca lanza errores.
 */
export async function notificarProfesional(aviso: {
  paciente: string;
  fecha: string;
  hora: string;
  accion: 'CANCELAR' | 'REAGENDAR';
  tardia?: boolean;
}): Promise<void> {
  try {
    if ((await getConfig('notif_whatsapp', 'true')) === 'false') return;
    if ((await getConfig('whatsapp_activo', 'true')) === 'false') return;

    const telefono = (await getConfig('notif_whatsapp_telefono', '')) || (await getConfig('telefono_contacto', ''));
    if (!telefono) return;

    const [year, month, day] = aviso.fecha.split('-').map(Number);
    const diaSemana = DIAS_CORTOS[new Date(year, month - 1, day).getDay()];
    const fechaCorta = `${diaSemana} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')} ${aviso.hora}`;

    const mensaje = aviso.accion === 'CANCELAR'
      ? `❌ *${aviso.paciente}* canceló su cita del ${fechaCorta}${aviso.tardia ? ' (cancelación tardía)' : ''}.`
      : `📅 *${aviso.paciente}* quiere reagendar su cita del ${fechaCorta}. Contáctalo para coordinar una nueva hora.`;

    await sendWhatsAppMessage({ phone: telefono, message: mensaje });
  } catch (error: any) {
    console.error('⚠️ No se pudo avisar al profesional:', error.message);
  }
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
