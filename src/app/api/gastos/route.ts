import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearGastoSchema } from '@/lib/schemas/finanzas';
import { listarGastos, crearGasto } from '@/services/finanzas/gastos';

export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const { searchParams } = new URL(request.url);
    const gastos = await listarGastos({
      categoria: searchParams.get('categoria'),
      estado: searchParams.get('estado'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
    });
    return NextResponse.json({ success: true, gastos });
  } catch (error) {
    return respuestaError(error, 'Error al obtener gastos');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearGastoSchema);
    if (!validacion.ok) return validacion.response;
    const gasto = await crearGasto(validacion.data);
    return NextResponse.json({ success: true, gasto, message: 'Gasto registrado exitosamente' });
  } catch (error) {
    return respuestaError(error, 'Error al crear gasto');
  }
}
