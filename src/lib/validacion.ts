import { NextResponse } from 'next/server';
import { z } from 'zod';

type ResultadoValidacion<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

// Mensaje único y en español para el usuario; el detalle por campo va aparte
// para que el front pueda marcar los inputs si lo necesita
function respuestaInvalida(error: z.ZodError): NextResponse {
  const primero = error.issues[0];
  return NextResponse.json(
    {
      success: false,
      error: primero?.message ?? 'Datos inválidos',
      campos: error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
    },
    { status: 400 }
  );
}

export function validar<T extends z.ZodType>(schema: T, datos: unknown): ResultadoValidacion<z.infer<T>> {
  const resultado = schema.safeParse(datos);
  return resultado.success
    ? { ok: true, data: resultado.data }
    : { ok: false, response: respuestaInvalida(resultado.error) };
}

export async function validarBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<ResultadoValidacion<z.infer<T>>> {
  let datos: unknown;
  try {
    datos = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ success: false, error: 'El cuerpo de la petición no es JSON válido' }, { status: 400 }) };
  }
  return validar(schema, datos);
}
