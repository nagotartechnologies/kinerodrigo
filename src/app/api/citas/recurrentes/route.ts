import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { respuestaError } from '@/lib/errores';
import { citasRecurrentesSchema } from '@/lib/schemas/citas';
import { crearCitasRecurrentes } from '@/services/citas/recurrentes';

export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, citasRecurrentesSchema);
    if (!validacion.ok) return validacion.response;
    const { citasCreadas, conflictos } = await crearCitasRecurrentes(validacion.data);
    const omitidas = conflictos.length > 0 ? `, ${conflictos.length} omitidas por conflicto` : '';
    return NextResponse.json({
      success: true,
      message: `${citasCreadas.length} citas creadas exitosamente${omitidas}`,
      citasCreadas,
      conflictos,
      totalCreadas: citasCreadas.length,
      totalConflictos: conflictos.length,
    });
  } catch (error) {
    return respuestaError(error, 'Error al crear citas recurrentes');
  }
}
