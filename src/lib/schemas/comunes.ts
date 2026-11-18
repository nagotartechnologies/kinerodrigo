import { z } from 'zod';

// Formatos de texto que usa la BD (ver AGENTS.md: fechas YYYY-MM-DD, horas HH:MM)
export const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD');
export const horaSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'La hora debe tener formato HH:MM');

export const textoOpcional = (max = 5000) => z.string().max(max).nullish();
export const textoRequerido = (campo: string, max = 500) =>
  z.string({ error: `${campo} es requerido` }).trim().min(1, `${campo} es requerido`).max(max);

// Acepta número o texto numérico (los formularios suelen mandar strings)
export const enteroPositivo = z.coerce.number().int().positive();
export const montoSchema = z.coerce.number({ error: 'El monto debe ser un número' }).nonnegative('El monto no puede ser negativo');
export const idSchema = enteroPositivo;
