import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { sesionSchema } from '@/lib/schemas/sesiones';
import { obtenerSesion } from '@/services/sesiones/consultas';
import { actualizarSesion, eliminarSesion } from '@/services/sesiones/mutaciones';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const sesion = await obtenerSesion(idDeParams((await params).id));
    return NextResponse.json({ success: true, sesion });
  } catch (error) {
    return respuestaError(error, 'Error al obtener la sesión');
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, sesionSchema);
    if (!validacion.ok) return validacion.response;
    await actualizarSesion(id, validacion.data);
    return NextResponse.json({ success: true, message: 'Sesión actualizada exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar la sesión');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarSesion(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Sesión eliminada exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar la sesión');
  }
}
