import { z } from 'zod';
import { fechaSchema, horaSchema, idSchema, textoRequerido } from './comunes';

const ESCALA_DOLOR_MAX = 10;
// Borg clásico llega a 20; la escala CR10 a 10. Se acepta el rango amplio
const ESCALA_BORG_MAX = 20;
const MAX_EJERCICIOS = 100;
const LARGO_TEXTO = 10000;

const vacioANull = (valor: unknown) => (valor === '' ? null : valor);
const aNumero = (valor: unknown) =>
  valor === '' || valor === null ? null : typeof valor === 'string' ? Number(valor) : valor;

const texto = z.preprocess(vacioANull, z.string().max(LARGO_TEXTO).nullable()).optional();
const escala = (max: number) => z.preprocess(aNumero, z.number().min(0).max(max).nullable()).optional();

// Pueden venir en formato antiguo (strings) o nuevo (objetos con ejercicioId)
const ejercicios = z.array(z.unknown()).max(MAX_EJERCICIOS).nullish();

const camposClinicos = {
  dolorInicial: escala(ESCALA_DOLOR_MAX),
  dolorFinal: escala(ESCALA_DOLOR_MAX),
  borgPercepcion: escala(ESCALA_BORG_MAX),
  movilidad: texto,
  fuerza: texto,
  progresoGeneral: texto,
  ejerciciosRealizados: ejercicios,
  observaciones: texto,
  recomendaciones: texto,
};

export const sesionSchema = z.object({
  pacienteId: idSchema,
  citaId: z.preprocess(aNumero, idSchema.nullable()).optional(),
  fecha: fechaSchema,
  hora: horaSchema,
  duracion: z.coerce.number().int().positive().max(600).optional(),
  tipo: textoRequerido('El tipo', 100),
  estado: z.string().trim().min(1).max(30).optional(),
  notasSesion: texto,
  proximaSesion: texto,
  ...camposClinicos,
});

export const completarSesionSchema = z.object(camposClinicos);

export type SesionInput = z.infer<typeof sesionSchema>;
export type CompletarSesionInput = z.infer<typeof completarSesionSchema>;
