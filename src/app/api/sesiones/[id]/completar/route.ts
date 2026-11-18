import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { completarSesionSchema } from '@/lib/schemas/sesiones';
import { completarSesion } from '@/services/sesiones/mutaciones';

// PUT - Completar una sesión (flujo rápido)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, completarSesionSchema);
    if (!validacion.ok) return validacion.response;
    await completarSesion(id, validacion.data);
    return NextResponse.json({ success: true, message: 'Sesión completada exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al completar la sesión');
  }
}
