import * as cron from 'node-cron';
import db from './db';
import { sendWhatsAppMessage, formatearMensajeRecordatorio } from './whatsapp';

let cronTask: any = null;

/**
 * Obtener valor de configuración
 */
async function getConfigValue(clave: string, defaultValue: any = ''): Promise<any> {
  try {
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
    if (!config) return defaultValue;
    
    // Convertir valores booleanos
    if (config.valor === 'true') return true;
    if (config.valor === 'false') return false;
    
    // Convertir números
    if (!isNaN(Number(config.valor))) return Number(config.valor);
    
    return config.valor;
  } catch (error) {
    console.error(`Error al obtener configuración ${clave}:`, error);
    return defaultValue;
  }
}

/**
 * Enviar recordatorios automáticos para citas próximas
 */
async function enviarRecordatoriosAutomaticos() {
  try {
    console.log('🔔 [CRON] Verificando citas para enviar recordatorios automáticos...');
    
    // Verificar si los recordatorios automáticos están activados
    const recordatoriosActivos = await getConfigValue('recordatorios_automaticos', true);
    if (!recordatoriosActivos) {
      console.log('⏸️  [CRON] Recordatorios automáticos desactivados en configuración');
      return;
    }

    // Verificar si WhatsApp está activo
    const whatsappActivo = await getConfigValue('whatsapp_activo', true);
    if (!whatsappActivo) {
      console.log('⏸️  [CRON] WhatsApp desactivado en configuración');
      return;
    }

    // Obtener horas antes para enviar recordatorio
    const horasAntes = await getConfigValue('recordatorios_horas_antes', 24);
    
    // Calcular fecha límite (ahora + horasAntes)
    const ahora = new Date();
    const fechaLimite = new Date(ahora.getTime() + (horasAntes * 60 * 60 * 1000));
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    console.log(`📅 [CRON] Buscando citas para el ${fechaLimiteStr} (${horasAntes}h antes)`);

    // Buscar citas próximas que aún no tienen recordatorio enviado
    const citas: any[] = await db.prepare(`
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
    `).all(fechaLimiteStr);

    if (citas.length === 0) {
      console.log('✅ [CRON] No hay citas pendientes de recordatorio');
      return;
    }

    console.log(`📨 [CRON] Encontradas ${citas.length} cita(s) para enviar recordatorio`);

    let enviados = 0;
    let errores = 0;

    for (const cita of citas) {
      try {
        console.log(`📤 [CRON] Enviando recordatorio para cita #${cita.id} - ${cita.paciente_nombre}`);

        // Formatear mensaje
        const mensaje = await formatearMensajeRecordatorio({
          paciente: cita.paciente_nombre,
          fecha: cita.fecha,
          hora: cita.hora,
          tipo: cita.tipo,
          duracion: cita.duracion
        });

        // Enviar mensaje por WhatsApp
        const resultado = await sendWhatsAppMessage({
          phone: cita.paciente_telefono,
          message: mensaje
        });

        // Registrar el envío en la base de datos
        await db.prepare(`
          INSERT INTO recordatorios (
            cita_id,
            mensaje_id,
            telefono,
            mensaje,
            estado,
            enviado_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          cita.id,
          resultado.idMessage || null,
          cita.paciente_telefono,
          mensaje,
          'enviado'
        );

        enviados++;
        console.log(`✅ [CRON] Recordatorio enviado exitosamente para cita #${cita.id}`);

        // Esperar 2 segundos entre mensajes para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        errores++;
        console.error(`❌ [CRON] Error al enviar recordatorio para cita #${cita.id}:`, error.message);
      }
    }

    console.log(`📊 [CRON] Resumen: ${enviados} enviados, ${errores} errores`);

  } catch (error) {
    console.error('❌ [CRON] Error en proceso de recordatorios automáticos:', error);
  }
}

/**
 * Iniciar el cron job de recordatorios
 * Se ejecuta cada 2 horas (patrón: 0 asterisco-barra-2 asterisco asterisco asterisco)
 */
export function iniciarCronRecordatorios() {
  if (cronTask) {
    console.log('⚠️  [CRON] El cron de recordatorios ya está en ejecución');
    return;
  }

  // Ejecutar cada 2 horas (a las 00:00, 02:00, 04:00, etc.)
  cronTask = cron.schedule('0 */2 * * *', () => {
    enviarRecordatoriosAutomaticos();
  }, {
    timezone: 'America/Santiago' // Zona horaria de Chile
  });

  console.log('✅ [CRON] Recordatorios automáticos iniciados (cada 2 horas)');

  // Ejecutar inmediatamente al iniciar (opcional)
  // enviarRecordatoriosAutomaticos();
}

/**
 * Detener el cron job de recordatorios
 */
export function detenerCronRecordatorios() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('⏹️  [CRON] Recordatorios automáticos detenidos');
  }
}

/**
 * Obtener estado del cron
 */
export function estadoCronRecordatorios() {
  // Calcular próxima ejecución (cada 2 horas en punto: 00, 02, 04, 06, etc.)
  let proximaEjecucion = null;
  if (cronTask) {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    
    // Calcular la próxima hora par
    let proximaHora = horaActual % 2 === 0 ? horaActual : horaActual + 1;
    
    // Si ya pasó el minuto 0 de la hora par actual, ir a la siguiente hora par
    if (horaActual % 2 === 0 && minutoActual > 0) {
      proximaHora = horaActual + 2;
    }
    
    const proxima = new Date(ahora);
    
    if (proximaHora >= 24) {
      proxima.setDate(proxima.getDate() + 1);
      proxima.setHours(proximaHora - 24, 0, 0, 0);
    } else {
      proxima.setHours(proximaHora, 0, 0, 0);
    }
    
    proximaEjecucion = proxima.toISOString();
  }
  
  return {
    activo: cronTask !== null,
    proximaEjecucion
  };
}

/**
 * Ejecutar manualmente el proceso de recordatorios (para testing)
 */
export async function ejecutarRecordatoriosManual() {
  console.log('🔧 [CRON] Ejecución manual de recordatorios');
  await enviarRecordatoriosAutomaticos();
}
