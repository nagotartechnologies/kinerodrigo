import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { ejercicioSchema } from '@/lib/schemas/configuracion';
import { listarEjercicios, crearEjercicio } from '@/services/agenda';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    return NextResponse.json({ success: true, ejercicios: await listarEjercicios() });
  } catch (error) {
    return respuestaError(error, 'Error al obtener ejercicios');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, ejercicioSchema);
    if (!validacion.ok) return validacion.response;
    const ejercicio = await crearEjercicio(validacion.data);
    return NextResponse.json({ success: true, ejercicio }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear ejercicio');
  }
}
