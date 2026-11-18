import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validar } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { camposPacienteSchema, normalizarCamposPaciente } from '@/lib/schemas/pacientes';
import { obtenerPaciente, actualizarPaciente, eliminarPaciente } from '@/services/pacientes/fichas';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const paciente = await obtenerPaciente(idDeParams((await params).id));
    return NextResponse.json({ success: true, paciente });
  } catch (error) {
    return respuestaError(error, 'Error al obtener paciente');
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const id = idDeParams((await params).id);
    const body = await request.json().catch(() => null);
    const validacion = validar(camposPacienteSchema, normalizarCamposPaciente(body));
    if (!validacion.ok) return validacion.response;
    const paciente = await actualizarPaciente(id, validacion.data);
    return NextResponse.json({ success: true, message: 'Paciente actualizado exitosamente', paciente });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar paciente');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarPaciente(idDeParams((await params).id));
    return NextResponse.json({ success: true, message: 'Paciente y todos sus datos relacionados eliminados exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar paciente');
  }
}
