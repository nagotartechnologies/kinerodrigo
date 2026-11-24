import db, { type SentenciaBatch } from '@/lib/db';
import { ErrorNegocio } from '@/lib/errores';
import { sendWhatsAppMessage, formatearMensajeCobro } from '@/lib/whatsapp';
import { leerConfiguracion } from '@/services/configuraciones';

// Pausa entre mensajes para no saturar al proveedor de WhatsApp
const PAUSA_ENTRE_ENVIOS_MS = 800;

export interface ResultadoEnvioCobro {
  pacienteId: number;
  nombre: string;
  estado: 'enviado' | 'error';
  error?: string;
}

interface PacienteDestino {
  id: number;
  nombre: string;
  telefono: string;
}

async function obtenerDestinatarios(pacienteIds: number[]): Promise<PacienteDestino[]> {
  const marcadores = pacienteIds.map(() => '?').join(', ');
  const filas = await db.prepare(`SELECT id, nombre, telefono FROM pacientes WHERE activo = 1 AND id IN (${marcadores})`).all(...pacienteIds);
  return filas.map((f) => ({ id: Number(f.id), nombre: String(f.nombre ?? ''), telefono: String(f.telefono ?? '') }));
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function enviarCobro(paciente: PacienteDestino): Promise<{ resultado: ResultadoEnvioCobro; registro: SentenciaBatch }> {
  const base = { pacienteId: paciente.id, nombre: paciente.nombre };
  const registrar = (mensaje: string, estado: 'enviado' | 'error', error: string | null): SentenciaBatch => ({
    sql: 'INSERT INTO recordatorios_pago (paciente_id, telefono, mensaje, estado, error_envio) VALUES (?, ?, ?, ?, ?)',
    args: [paciente.id, paciente.telefono, mensaje, estado, error],
  });

  if (!paciente.telefono.trim()) {
    const error = 'El paciente no tiene teléfono registrado';
    return { resultado: { ...base, estado: 'error', error }, registro: registrar('', 'error', error) };
  }
  const mensaje = await formatearMensajeCobro({ paciente: paciente.nombre });
  try {
    await sendWhatsAppMessage({ phone: paciente.telefono, message: mensaje });
    return { resultado: { ...base, estado: 'enviado' }, registro: registrar(mensaje, 'enviado', null) };
  } catch (err) {
    console.error(`Error al enviar recordatorio de pago al paciente #${paciente.id}:`, err);
    const error = 'No se pudo enviar el WhatsApp';
    return { resultado: { ...base, estado: 'error', error }, registro: registrar(mensaje, 'error', err instanceof Error ? err.message : String(err)) };
  }
}

export async function enviarRecordatoriosPago(pacienteIds: number[]): Promise<ResultadoEnvioCobro[]> {
  const whatsappActivo = await leerConfiguracion('whatsapp_activo');
  if (whatsappActivo === 'false') throw new ErrorNegocio('WhatsApp está desactivado en Configuración');

  const pacientes = await obtenerDestinatarios(pacienteIds);
  if (!pacientes.length) throw new ErrorNegocio('No se encontraron los pacientes seleccionados');

  const resultados: ResultadoEnvioCobro[] = [];
  const registros: SentenciaBatch[] = [];
  // Secuencial a propósito: el proveedor de WhatsApp no tolera ráfagas de envíos
  for (const [indice, paciente] of pacientes.entries()) {
    if (indice > 0) await esperar(PAUSA_ENTRE_ENVIOS_MS);
    const { resultado, registro } = await enviarCobro(paciente);
    resultados.push(resultado);
    registros.push(registro);
  }
  await db.batch(registros);
  return resultados;
}
