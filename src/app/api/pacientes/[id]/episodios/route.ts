import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { crearEpisodioSchema } from '@/lib/schemas/pacientes';
import { listarEpisodios, crearEpisodio } from '@/services/pacientes/episodios';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const resultado = await listarEpisodios(idDeParams((await params).id));
    return NextResponse.json({ success: true, ...resultado });
  } catch (error) {
    return respuestaError(error, 'Error al obtener episodios del paciente');
  }
}

// POST - Cierra el episodio actual y abre uno nuevo
export async function POST(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, crearEpisodioSchema);
    if (!validacion.ok) return validacion.response;
    const { numero, episodio } = await crearEpisodio(id, validacion.data);
    return NextResponse.json({ success: true, message: `Episodio ${numero} creado exitosamente`, episodio }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear episodio');
  }
}
