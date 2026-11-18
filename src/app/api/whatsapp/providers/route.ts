import { NextRequest, NextResponse } from 'next/server';
import { getAllProvidersStatus } from '@/lib/whatsapp/factory';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { cambiarProveedorSchema, credencialesProveedorSchema } from '@/lib/schemas/whatsapp';
import { proveedorActivo, cambiarProveedor, guardarCredenciales } from '@/services/whatsappProveedores';

// GET - Estado de todos los proveedores
export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const [providers, activeProvider] = await Promise.all([getAllProvidersStatus(), proveedorActivo()]);
    return NextResponse.json({ success: true, providers, activeProvider, testMode: process.env.WHATSAPP_TEST_MODE === 'true' });
  } catch (error) {
    return respuestaError(error, 'Error al obtener proveedores');
  }
}

// POST - Cambiar proveedor activo
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, cambiarProveedorSchema);
    if (!validacion.ok) return validacion.response;
    const { provider } = validacion.data;
    await cambiarProveedor(provider);
    return NextResponse.json({ success: true, message: `Proveedor cambiado a: ${provider}`, provider });
  } catch (error) {
    return respuestaError(error, 'Error al cambiar proveedor');
  }
}

// PUT - Actualizar credenciales de un proveedor
export async function PUT(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, credencialesProveedorSchema);
    if (!validacion.ok) return validacion.response;
    const { provider, credentials } = validacion.data;
    await guardarCredenciales(provider, credentials);
    return NextResponse.json({ success: true, message: `Credenciales de ${provider} actualizadas exitosamente` });
  } catch (error) {
    return respuestaError(error, 'Error al actualizar credenciales');
  }
}
