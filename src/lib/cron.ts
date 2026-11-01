import db from './db';
import { sendWhatsAppMessage, formatearMensajeRecordatorio } from './whatsapp';
import { fechaHoraChile } from './horaChile';

/**
 * Registrar un envío fallido para que quede visible en la agenda.
 * Si la cita ya tiene un error registrado se actualiza en vez de duplicarlo.
 */
export async function registrarErrorEnvio(citaId: number, telefono: string, error: string) {
  try {
    const { changes } = await db.prepare(`
      UPDATE recordatorios SET error_envio = ?, enviado_at = CURRENT_TIMESTAMP
      WHERE cita_id = ? AND estado = 'error'
    `).run(error, citaId);
    if (!changes) {
      await db.prepare(`
        INSERT INTO recordatorios (cita_id, telefono, mensaje, estado, error_envio, enviado_at)
        VALUES (?, ?, '', 'error', ?, CURRENT_TIMESTAMP)
      `).run(citaId, telefono || '', error);
    }
  } catch (err) {
    console.error(`⚠️ No se pudo registrar el error de la cita #${citaId}:`, err);
  }
}

/**
 * Obtener valor de configuración
 */
async function getConfigValue(clave: string, defaultValue: any = ''): Promise<any> {
  try {
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
    if (!config) return defaultValue;
    
    if (config.valor === 'true') return true;
    if (config.valor === 'false') return false;
    if (!isNaN(Number(config.valor))) return Number(config.valor);
    
    return config.valor;
  } catch (error) {
    console.error(`Error al obtener configuración ${clave}:`, error);
    return defaultValue;
  }
}

/**
 * Enviar recordatorios automáticos para citas próximas.
 * Retorna un resumen con la cantidad de enviados y errores.
 * En producción se ejecuta via Netlify Scheduled Function (cada 2h).
 * En desarrollo se ejecuta via POST /api/cron/recordatorios { accion: 'ejecutar' }.
 */
export async function enviarRecordatoriosAutomaticos(): Promise<{ enviados: number; errores: number; total: number; detalles: any[] }> {
  const resultado = { enviados: 0, errores: 0, total: 0, detalles: [] as any[] };

  try {
    console.log('🔔 Verificando citas para enviar recordatorios automáticos...');
    
    const recordatoriosActivos = await getConfigValue('recordatorios_automaticos', true);
    if (!recordatoriosActivos) {
      console.log('⏸️ Recordatorios automáticos desactivados');
      return resultado;
    }

    const whatsappActivo = await getConfigValue('whatsapp_activo', true);
    if (!whatsappActivo) {
      console.log('⏸️ WhatsApp desactivado');
      return resultado;
    }

    const horasAntes = Number(await getConfigValue('recordatorios_horas_antes', 24)) || 24;
    
    // Ventana en hora de Chile: citas entre ahora y ahora + horasAntes
    const ahora = new Date();
    const ahoraStr = fechaHoraChile(ahora);
    const limiteStr = fechaHoraChile(new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000));
    
    console.log(`📅 Buscando citas entre ${ahoraStr} y ${limiteStr} (${horasAntes}h antes)`);

    // Solo un recordatorio con estado 'enviado' bloquea el reenvío:
    // los 'error' se reintentan y los 'obsoleto' (cita movida) no cuentan
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
      WHERE (c.fecha || ' ' || c.hora) > ?
        AND (c.fecha || ' ' || c.hora) <= ?
        AND c.estado IN ('pendiente', 'confirmada')
        AND p.activo = 1
        AND p.telefono IS NOT NULL
        AND p.telefono != ''
        AND NOT EXISTS (
          SELECT 1 FROM recordatorios r WHERE r.cita_id = c.id AND r.estado = 'enviado'
        )
      ORDER BY c.fecha ASC, c.hora ASC
    `).all(ahoraStr, limiteStr);

    resultado.total = citas.length;

    if (citas.length === 0) {
      console.log('✅ No hay citas pendientes de recordatorio');
      return resultado;
    }

    console.log(`📨 Encontradas ${citas.length} cita(s) para enviar recordatorio`);

    for (const cita of citas) {
      try {
        const mensaje = await formatearMensajeRecordatorio({
          paciente: cita.paciente_nombre,
          fecha: cita.fecha,
          hora: cita.hora,
          tipo: cita.tipo,
          duracion: cita.duracion
        });

        // Enviar mensaje de texto plano (sin botones interactivos)
        const envioResultado = await sendWhatsAppMessage({
          phone: cita.paciente_telefono,
          message: mensaje
        });

        await db.prepare(`
          INSERT INTO recordatorios (cita_id, mensaje_id, telefono, mensaje, estado, enviado_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(cita.id, envioResultado.idMessage || null, cita.paciente_telefono, mensaje, 'enviado');

        resultado.enviados++;
        resultado.detalles.push({ citaId: cita.id, paciente: cita.paciente_nombre, estado: 'enviado' });
        console.log(`✅ Recordatorio enviado para cita #${cita.id} - ${cita.paciente_nombre}`);

        // Esperar 2s entre mensajes para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        resultado.errores++;
        resultado.detalles.push({ citaId: cita.id, paciente: cita.paciente_nombre, estado: 'error', error: error.message });
        console.error(`❌ Error recordatorio cita #${cita.id}:`, error.message);
        await registrarErrorEnvio(cita.id, cita.paciente_telefono, error.message);
      }
    }

    console.log(`📊 Resumen: ${resultado.enviados} enviados, ${resultado.errores} errores`);
    return resultado;

  } catch (error) {
    console.error('❌ Error en proceso de recordatorios:', error);
    return resultado;
  }
}

/**
 * Funciones de compatibilidad con endpoints existentes.
 * En producción, el cron real es la Netlify Scheduled Function.
 * Estas funciones solo sirven para la API de control manual.
 */
export function iniciarCronRecordatorios() {
  console.log('ℹ️ Cron de recordatorios gestionado por Netlify Scheduled Functions en producción');
}

export function detenerCronRecordatorios() {
  console.log('ℹ️ Cron de recordatorios gestionado por Netlify Scheduled Functions en producción');
}

export function estadoCronRecordatorios() {
  // Calcular próxima ejecución (cada 2 horas en punto)
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();
  let proximaHora = horaActual % 2 === 0 ? horaActual : horaActual + 1;
  if (horaActual % 2 === 0 && minutoActual > 0) proximaHora = horaActual + 2;
  const proxima = new Date(ahora);
  if (proximaHora >= 24) {
    proxima.setDate(proxima.getDate() + 1);
    proxima.setHours(proximaHora - 24, 0, 0, 0);
  } else {
    proxima.setHours(proximaHora, 0, 0, 0);
  }

  return {
    activo: true,
    tipo: 'netlify-scheduled',
    frecuencia: 'cada 2 horas',
    proximaEjecucion: proxima.toISOString(),
    nota: 'Gestionado por Netlify Scheduled Functions en producción'
  };
}

export async function ejecutarRecordatoriosManual() {
  console.log('🔧 Ejecución manual de recordatorios');
  return await enviarRecordatoriosAutomaticos();
}
