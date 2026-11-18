import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearCategoriaSchema } from '@/lib/schemas/finanzas';
import { listarCategorias, crearCategoria } from '@/services/finanzas/categorias';

export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    return NextResponse.json({ success: true, categorias: await listarCategorias() });
  } catch (error) {
    return respuestaError(error, 'Error al obtener categorias');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearCategoriaSchema);
    if (!validacion.ok) return validacion.response;
    const categoria = await crearCategoria(validacion.data.nombre, validacion.data.color);
    return NextResponse.json({ success: true, categoria, message: 'Categoria creada' });
  } catch (error) {
    return respuestaError(error, 'Error al crear categoria');
  }
}
