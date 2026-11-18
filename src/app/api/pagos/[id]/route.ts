import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarPagoSchema } from '@/lib/schemas/finanzas';
import { obtenerPago, actualizarPago, eliminarPago } from '@/services/finanzas/pagos';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const pago = await obtenerPago(idDeParams((await params).id));
    return NextResponse.json({ success: true, pago });
  } catch (error) {
    return respuestaError(error, 'Error al obtener pago');
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, actualizarPagoSchema);
    if (!validacion.ok) return validacion.response;
    const pago = await actualizarPago(id, validacion.data);
    return NextResponse.json({ success: true, pago, message: 'Pago actualizado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar pago');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarPago(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Pago eliminado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar pago');
  }
}
