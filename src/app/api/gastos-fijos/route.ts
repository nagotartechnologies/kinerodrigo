import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validar, validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { crearGastoFijoSchema, mesSchema } from '@/lib/schemas/finanzas';
import { listarGastosFijos, crearGastoFijo, generarGastosDelMes } from '@/services/finanzas/gastosFijos';

export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    return NextResponse.json({ success: true, gastosFijos: await listarGastosFijos() });
  } catch (error) {
    return respuestaError(error, 'Error al obtener gastos fijos');
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearGastoFijoSchema);
    if (!validacion.ok) return validacion.response;
    const gastoFijo = await crearGastoFijo(validacion.data);
    return NextResponse.json({ success: true, gastoFijo, message: 'Gasto fijo creado' });
  } catch (error) {
    return respuestaError(error, 'Error al crear gasto fijo');
  }
}

// PATCH - Generar los gastos del mes (?mes=YYYY-MM) desde los gastos fijos activos
export async function PATCH(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = validar(mesSchema, new URL(request.url).searchParams.get('mes') ?? undefined);
    if (!validacion.ok) return validacion.response;
    const mes = validacion.data;
    const resultado = await generarGastosDelMes(mes);
    return NextResponse.json({ success: true, ...resultado, message: `${resultado.generados} gasto(s) generado(s) para ${mes}` });
  } catch (error) {
    return respuestaError(error, 'Error al generar gastos');
  }
}
