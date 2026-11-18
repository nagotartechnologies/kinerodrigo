import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { respuestaError } from '@/lib/errores';
import { subirLogo, eliminarLogo } from '@/services/logo';

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const logoUrl = await subirLogo(await request.formData());
    return NextResponse.json({ success: true, logoUrl, message: 'Logo subido exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al subir el logo');
  }
}

export async function DELETE(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    await eliminarLogo();
    return NextResponse.json({ success: true, message: 'Logo eliminado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar el logo');
  }
}
