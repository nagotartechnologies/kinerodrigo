import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { horarioBloqueadoSchema } from '@/lib/schemas/configuracion';
import { listarHorariosBloqueados, crearHorarioBloqueado } from '@/services/agenda';

export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const horarios = await listarHorariosBloqueados(new URL(request.url).searchParams.get('fecha'));
    return NextResponse.json({ success: true, horarios });
  } catch (error) {
    return respuestaError(error, 'Error al obtener horarios bloqueados');
  }
}

export async function POST(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, horarioBloqueadoSchema);
    if (!validacion.ok) return validacion.response;
    const horario = await crearHorarioBloqueado(validacion.data);
    return NextResponse.json({ success: true, horario });
  } catch (error) {
    return respuestaError(error, 'Error al crear horario bloqueado');
  }
}
