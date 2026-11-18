import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearUsuarioSchema } from '@/lib/schemas/usuarios';
import { listarUsuarios, crearUsuario } from '@/services/usuarios';

export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    return NextResponse.json({ success: true, usuarios: await listarUsuarios() });
  } catch (error) {
    return respuestaError(error, 'Error al obtener usuarios');
  }
}

export async function POST(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearUsuarioSchema);
    if (!validacion.ok) return validacion.response;
    const usuario = await crearUsuario(validacion.data);
    return NextResponse.json({ success: true, message: 'Usuario creado exitosamente', usuario });
  } catch (error) {
    return respuestaError(error, 'Error al crear usuario');
  }
}
