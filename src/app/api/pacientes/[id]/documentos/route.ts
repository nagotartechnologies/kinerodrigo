import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { respuestaError, idDeParams } from '@/lib/errores';
import { listarDocumentos, subirDocumento, eliminarDocumento } from '@/services/pacientes/documentos';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const documentos = await listarDocumentos(idDeParams((await params).id));
    return NextResponse.json({ success: true, documentos });
  } catch (error) {
    return respuestaError(error, 'Error al obtener documentos');
  }
}

export async function POST(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const documento = await subirDocumento(idDeParams((await params).id), await request.formData());
    return NextResponse.json({ success: true, documento }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al subir documento');
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const docId = new URL(request.url).searchParams.get('docId');
    if (!docId) return NextResponse.json({ success: false, error: 'Falta docId' }, { status: 400 });
    await eliminarDocumento(idDeParams((await params).id), idDeParams(docId));
    return NextResponse.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    return respuestaError(error, 'Error al eliminar documento');
  }
}
