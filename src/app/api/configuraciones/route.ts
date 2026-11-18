import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { configuracionSchema, configuracionesLoteSchema } from '@/lib/schemas/configuracion';
import { listarConfiguraciones, guardarConfiguracion, guardarConfiguraciones } from '@/services/configuraciones';

// GET - Todas las configuraciones o las de una categoría
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const configuraciones = await listarConfiguraciones(new URL(request.url).searchParams.get('categoria'));
    return NextResponse.json({ success: true, configuraciones });
  } catch (error) {
    return respuestaError(error, 'Error al obtener configuraciones');
  }
}

// PUT - Crear o actualizar una configuración
export async function PUT(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, configuracionSchema);
    if (!validacion.ok) return validacion.response;
    const { creada } = await guardarConfiguracion(validacion.data.clave, validacion.data.valor);
    const message = creada ? 'Configuración creada exitosamente' : 'Configuración actualizada exitosamente';
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar configuración');
  }
}

// POST - Actualizar varias configuraciones existentes
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, configuracionesLoteSchema);
    if (!validacion.ok) return validacion.response;
    await guardarConfiguraciones(validacion.data.configuraciones);
    return NextResponse.json({ success: true, message: 'Configuraciones actualizadas exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar configuraciones');
  }
}
