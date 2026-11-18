import { NextResponse } from 'next/server';

// Error esperado de una regla de negocio: su mensaje es apto para mostrar al usuario
export class ErrorNegocio extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = 'ErrorNegocio';
  }
}

export function noEncontrado(mensaje: string): ErrorNegocio {
  return new ErrorNegocio(mensaje, 404);
}

// Traduce cualquier error de un servicio a la respuesta HTTP. Los errores
// inesperados se registran y al usuario solo le llega el mensaje genérico
export function respuestaError(error: unknown, mensajeGenerico: string): NextResponse {
  if (error instanceof ErrorNegocio) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(`${mensajeGenerico}:`, error);
  return NextResponse.json({ success: false, error: mensajeGenerico }, { status: 500 });
}

export function idDeParams(valor: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorNegocio('Identificador inválido');
  return id;
}
