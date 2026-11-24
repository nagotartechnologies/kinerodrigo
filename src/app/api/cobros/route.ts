import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { enviarRecordatoriosPagoSchema } from '@/lib/schemas/finanzas';
import { enviarRecordatoriosPago } from '@/services/finanzas/cobros';

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, enviarRecordatoriosPagoSchema);
    if (!validacion.ok) return validacion.response;
    const resultados = await enviarRecordatoriosPago(validacion.data.pacienteIds);
    return NextResponse.json({ success: true, resultados });
  } catch (error) {
    return respuestaError(error, 'Error al enviar los recordatorios de pago');
  }
}
