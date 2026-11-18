import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarEpisodioSchema } from '@/lib/schemas/pacientes';
import { actualizarEpisodio } from '@/services/pacientes/episodios';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; episodioId: string }> }) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const { id, episodioId } = await params;
    const validacion = await validarBody(request, actualizarEpisodioSchema);
    if (!validacion.ok) return validacion.response;
    const episodio = await actualizarEpisodio(idDeParams(id), idDeParams(episodioId), validacion.data);
    return NextResponse.json({ success: true, message: 'Episodio actualizado exitosamente', episodio });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar episodio');
  }
}
