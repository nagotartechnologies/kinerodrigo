import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarCitaSchema } from '@/lib/schemas/citas';
import { obtenerCita } from '@/services/citas/consultas';
import { actualizarCita, eliminarCita } from '@/services/citas/mutaciones';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const cita = await obtenerCita(idDeParams((await params).id));
    return NextResponse.json({ success: true, cita });
  } catch (error) {
    return respuestaError(error, 'Error al obtener la cita');
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, actualizarCitaSchema);
    if (!validacion.ok) return validacion.response;
    const cita = await actualizarCita(id, validacion.data);
    return NextResponse.json({ success: true, message: 'Cita actualizada exitosamente', cita });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar la cita');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarCita(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Cita y datos relacionados eliminados exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar la cita');
  }
}
