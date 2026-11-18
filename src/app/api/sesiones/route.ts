import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { sesionSchema } from '@/lib/schemas/sesiones';
import { listarSesiones } from '@/services/sesiones/consultas';
import { crearSesion } from '@/services/sesiones/mutaciones';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const { searchParams } = new URL(request.url);
    const sesiones = await listarSesiones({
      pacienteId: searchParams.get('pacienteId'),
      estado: searchParams.get('estado'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
    });
    return NextResponse.json({ success: true, sesiones, total: sesiones.length });
  } catch (error) {
    return respuestaError(error, 'Error al obtener sesiones');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, sesionSchema);
    if (!validacion.ok) return validacion.response;
    const sesion = await crearSesion(validacion.data);
    return NextResponse.json({ success: true, sesion }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear sesión');
  }
}
