import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { ejercicioSchema } from '@/lib/schemas/configuracion';
import { actualizarEjercicio, eliminarEjercicio } from '@/services/agenda';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, ejercicioSchema);
    if (!validacion.ok) return validacion.response;
    await actualizarEjercicio(id, validacion.data);
    return NextResponse.json({ success: true, message: 'Ejercicio actualizado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar ejercicio');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarEjercicio(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Ejercicio eliminado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar ejercicio');
  }
}
