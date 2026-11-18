import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearPagoSchema } from '@/lib/schemas/finanzas';
import { listarPagos, crearPago } from '@/services/finanzas/pagos';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const { searchParams } = new URL(request.url);
    const pagos = await listarPagos({
      pacienteId: searchParams.get('pacienteId'),
      estado: searchParams.get('estado'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
    });
    return NextResponse.json({ success: true, pagos });
  } catch (error) {
    return respuestaError(error, 'Error al obtener pagos');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearPagoSchema);
    if (!validacion.ok) return validacion.response;
    const pago = await crearPago(validacion.data);
    return NextResponse.json({ success: true, pago, message: 'Pago registrado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al crear pago');
  }
}
