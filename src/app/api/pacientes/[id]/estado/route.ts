import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { cambiarEstadoPacienteSchema } from '@/lib/schemas/pacientes';
import { cambiarEstadoPaciente, historialEstados } from '@/services/pacientes/estados';

type Contexto = { params: Promise<{ id: string }> };

// POST - Cambiar estado del paciente (activo, alta, abandono)
export async function POST(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, cambiarEstadoPacienteSchema);
    if (!validacion.ok) return validacion.response;
    const { estado } = validacion.data;
    const { cambiado, estadoAnterior, paciente } = await cambiarEstadoPaciente(id, validacion.data);
    const message = cambiado
      ? `Estado del paciente cambiado de "${estadoAnterior}" a "${estado}"`
      : 'El paciente ya tiene ese estado';
    return NextResponse.json({ success: true, message, paciente });
  } catch (error) {
    return respuestaError(error, 'Error al cambiar estado del paciente');
  }
}

// GET - Historial de cambios de estado
export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const resultado = await historialEstados(idDeParams((await params).id));
    return NextResponse.json({ success: true, ...resultado });
  } catch (error) {
    return respuestaError(error, 'Error al obtener historial de estados');
  }
}
