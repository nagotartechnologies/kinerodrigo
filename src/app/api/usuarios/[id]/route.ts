import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError, idDeParams } from '@/lib/errores';
import { actualizarUsuarioSchema } from '@/lib/schemas/usuarios';
import { actualizarUsuario, eliminarUsuario } from '@/services/usuarios';

type Contexto = { params: Promise<{ id: string }> };

const NO_AUTORIZADO = () => NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

export async function PUT(request: Request, { params }: Contexto) {
  const auth = await verifyAuth(request);
  if (!auth.user) return NO_AUTORIZADO();
  try {
    const id = idDeParams((await params).id);
    const validacion = await validarBody(request, actualizarUsuarioSchema);
    if (!validacion.ok) return validacion.response;
    const usuario = await actualizarUsuario(id, validacion.data, auth.user.id);
    return NextResponse.json({ success: true, message: 'Usuario actualizado exitosamente', usuario });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar usuario');
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  const auth = await verifyAuth(request);
  if (!auth.user) return NO_AUTORIZADO();
  try {
    await eliminarUsuario(idDeParams((await params).id), auth.user.id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar usuario');
  }
}
