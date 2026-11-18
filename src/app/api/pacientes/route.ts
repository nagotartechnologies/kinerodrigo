import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validar } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearPacienteSchema, normalizarCamposPaciente } from '@/lib/schemas/pacientes';
import { listarPacientes, crearPaciente } from '@/services/pacientes/fichas';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    return NextResponse.json({ success: true, pacientes: await listarPacientes() });
  } catch (error) {
    return respuestaError(error, 'Error al obtener pacientes');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const body = await request.json().catch(() => null);
    const validacion = validar(crearPacienteSchema, normalizarCamposPaciente(body));
    if (!validacion.ok) return validacion.response;
    const paciente = await crearPaciente(validacion.data);
    return NextResponse.json({ success: true, message: 'Paciente creado exitosamente', paciente }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear paciente');
  }
}
