import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { cambiarEstadoCitaSchema } from '@/lib/schemas/citas';
import { cambiarEstadoCita } from '@/services/citas/mutaciones';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, cambiarEstadoCitaSchema);
    if (!validacion.ok) return validacion.response;
    const cita = await cambiarEstadoCita(id, validacion.data.estado);
    return NextResponse.json({ success: true, message: 'Estado actualizado exitosamente', cita });
  } catch (error) {
    return respuestaError(error, 'Error al cambiar el estado');
  }
}
