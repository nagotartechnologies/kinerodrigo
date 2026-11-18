import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarGastoFijoSchema } from '@/lib/schemas/finanzas';
import { actualizarGastoFijo, eliminarGastoFijo } from '@/services/finanzas/gastosFijos';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, actualizarGastoFijoSchema);
    if (!validacion.ok) return validacion.response;
    const gastoFijo = await actualizarGastoFijo(id, validacion.data);
    return NextResponse.json({ success: true, gastoFijo, message: 'Gasto fijo actualizado' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar gasto fijo');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarGastoFijo(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Gasto fijo eliminado' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar gasto fijo');
  }
}
