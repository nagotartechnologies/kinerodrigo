import { z } from 'zod';
import { fechaSchema, horaSchema, idSchema, textoRequerido } from './comunes';

const LARGO_VALOR_CONFIG = 10000;
const MAX_CONFIGS_POR_LOTE = 200;
const MAX_IDS_POR_LOTE = 200;

const claveSchema = z.string({ error: 'La clave es requerida' }).regex(/^[a-z0-9_]{1,100}$/, 'Clave de configuración inválida');
const valorSchema = z.union([z.string().max(LARGO_VALOR_CONFIG), z.number(), z.boolean(), z.null()]);

export const configuracionSchema = z.object({ clave: claveSchema, valor: valorSchema });

export const configuracionesLoteSchema = z.object({
  configuraciones: z.array(configuracionSchema, { error: 'Se esperaba un array de configuraciones' }).max(MAX_CONFIGS_POR_LOTE),
});

export const horarioBloqueadoSchema = z.object({
  fecha: fechaSchema,
  hora_inicio: horaSchema,
  hora_fin: horaSchema,
  motivo: z.string().max(200).nullish(),
  tipo: z.string().max(30).nullish(),
}).refine((h) => h.hora_inicio < h.hora_fin, { message: 'La hora de fin debe ser posterior a la de inicio' });

export const ejercicioSchema = z.object({
  nombre: textoRequerido('El nombre del ejercicio', 200),
  descripcion: z.string().trim().max(2000).nullish(),
  categoria: z.string().trim().max(100).nullish(),
});

export const marcarRevisadosSchema = z.object({
  ids: z.array(idSchema, { error: 'Se requiere una lista de ids' }).min(1, 'Se requiere una lista de ids').max(MAX_IDS_POR_LOTE),
});

export type ValorConfig = z.infer<typeof valorSchema>;
export type HorarioBloqueadoInput = z.infer<typeof horarioBloqueadoSchema>;
export type EjercicioInput = z.infer<typeof ejercicioSchema>;
