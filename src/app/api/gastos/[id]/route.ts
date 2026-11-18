import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarGastoSchema } from '@/lib/schemas/finanzas';
import { actualizarGasto, eliminarGasto } from '@/services/finanzas/gastos';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, actualizarGastoSchema);
    if (!validacion.ok) return validacion.response;
    const gasto = await actualizarGasto(id, validacion.data);
    return NextResponse.json({ success: true, gasto, message: 'Gasto actualizado' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar gasto');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarGasto(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Gasto eliminado' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar gasto');
  }
}
