import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { telefonoPruebaSchema } from '@/lib/schemas/whatsapp';

const MENSAJE_PRUEBA = 'Mensaje de prueba desde KINE-CITAS. Si recibes este mensaje, la conexion de WhatsApp esta funcionando correctamente.';

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, telefonoPruebaSchema);
    if (!validacion.ok) return validacion.response;
    const provider = await getWhatsAppProvider();
    const result = await provider.sendMessage({ phone: validacion.data.telefono, message: MENSAJE_PRUEBA });
    return NextResponse.json({ success: true, provider: provider.name, messageId: result.idMessage });
  } catch (error) {
    // Es una pantalla de diagnóstico: el motivo que da el proveedor le sirve al usuario
    const detalle = error instanceof Error ? `: ${error.message}` : '';
    return respuestaError(error, `Error al enviar mensaje de prueba${detalle}`);
  }
}
