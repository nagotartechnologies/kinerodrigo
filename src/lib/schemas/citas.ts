import { z } from 'zod';
import { fechaSchema, horaSchema, idSchema, textoOpcional, textoRequerido } from './comunes';

export const ESTADOS_CITA = ['pendiente', 'confirmada', 'completada', 'cancelada', 'reagendar'] as const;
// Desde la UI solo se pasa entre estos; 'reagendar' lo pone el webhook
export const ESTADOS_CITA_MANUALES = ['pendiente', 'confirmada', 'completada', 'cancelada'] as const;

const DURACION_MAXIMA_MIN = 600;
const SEMANAS_RECURRENTES_MAX = 52;

const duracionSchema = z.coerce.number().int().positive('La duración debe ser mayor a 0').max(DURACION_MAXIMA_MIN);

export const crearCitaSchema = z.object({
  pacienteId: idSchema,
  fecha: fechaSchema,
  hora: horaSchema,
  duracion: duracionSchema.optional(),
  tipo: textoRequerido('El tipo', 100),
  notas: textoOpcional(),
});

export const actualizarCitaSchema = z.object({
  pacienteId: idSchema.optional(),
  fecha: fechaSchema.optional(),
  hora: horaSchema.optional(),
  duracion: duracionSchema.optional(),
  tipo: textoRequerido('El tipo', 100).optional(),
  estado: z.enum(ESTADOS_CITA).optional(),
  notas: textoOpcional(),
});

export const cambiarEstadoCitaSchema = z.object({
  estado: z.enum(ESTADOS_CITA_MANUALES, { error: 'Estado inválido' }),
});

export const citasRecurrentesSchema = z.object({
  pacienteId: idSchema,
  horaInicio: horaSchema,
  duracion: duracionSchema.optional(),
  tipo: textoRequerido('El tipo', 100),
  notas: textoOpcional(),
  cantidadSemanas: z.coerce.number().int().min(1).max(SEMANAS_RECURRENTES_MAX),
  diasSemana: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Selecciona al menos un día de la semana'),
});

export type CrearCitaInput = z.infer<typeof crearCitaSchema>;
export type ActualizarCitaInput = z.infer<typeof actualizarCitaSchema>;
export type CitasRecurrentesInput = z.infer<typeof citasRecurrentesSchema>;
