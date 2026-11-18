import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearCitaSchema } from '@/lib/schemas/citas';
import { listarCitas } from '@/services/citas/consultas';
import { crearCita } from '@/services/citas/mutaciones';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const { searchParams } = new URL(request.url);
    const citas = await listarCitas({
      fecha: searchParams.get('fecha'),
      pacienteId: searchParams.get('paciente_id'),
      estado: searchParams.get('estado'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
      sinFiltro: searchParams.get('sinFiltro'),
    });
    return NextResponse.json({ success: true, citas, total: citas.length });
  } catch (error) {
    return respuestaError(error, 'Error al obtener las citas');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearCitaSchema);
    if (!validacion.ok) return validacion.response;
    const cita = await crearCita(validacion.data);
    return NextResponse.json({ success: true, message: 'Cita creada exitosamente', cita }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear la cita');
  }
}
