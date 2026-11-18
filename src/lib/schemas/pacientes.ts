import { z } from 'zod';

export const ESTADOS_PACIENTE = ['activo', 'alta', 'abandono'] as const;

const LARGO_TEXTO_CLINICO = 10000;

// Los formularios mandan '' en campos vacíos: se guardan como NULL
const vacioANull = (valor: unknown) => (valor === '' ? null : valor);
const aNumero = (valor: unknown) =>
  valor === '' || valor === null ? null : typeof valor === 'string' ? Number(valor) : valor;

const texto = z.preprocess(vacioANull, z.string().max(LARGO_TEXTO_CLINICO).nullable()).optional();
const numero = z.preprocess(aNumero, z.number({ error: 'Debe ser un número' }).nonnegative().nullable()).optional();

// Columnas editables de la ficha. Las claves son nombres reales de columna,
// así que también sirven como lista blanca para armar el UPDATE
export const camposPacienteSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200).optional(),
  rut: texto,
  telefono: texto,
  edad: numero,
  altura: numero,
  peso: numero,
  ocupacion: texto,
  enfermedades: texto,
  enfermedades_hereditarias: texto,
  deportes: texto,
  alimentacion: texto,
  consumo_agua: texto,
  descanso: texto,
  psicologicamente: texto,
  digestion: texto,
  lesion_consulta: texto,
  objetivo_paciente: texto,
  evaluacion_fisica: texto,
  sesiones_programadas: numero,
  evaluacion_final: texto,
  estado_tratamiento: texto,
});

export type CamposPaciente = z.infer<typeof camposPacienteSchema>;
export const COLUMNAS_PACIENTE = Object.keys(camposPacienteSchema.shape) as (keyof CamposPaciente)[];

export const crearPacienteSchema = camposPacienteSchema.extend({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(200),
});

const textoCorto = z.string().max(2000).nullish();

export const cambiarEstadoPacienteSchema = z.object({
  estado: z.enum(ESTADOS_PACIENTE, { error: 'Estado inválido. Debe ser: activo, alta o abandono' }),
  motivo: textoCorto,
  notas: textoCorto,
});

export const crearEpisodioSchema = z.object({
  motivoLesion: texto,
  objetivo: texto,
  evaluacionFisica: texto,
});

export const actualizarEpisodioSchema = crearEpisodioSchema.extend({
  evaluacionFinal: texto,
});

export type CrearEpisodioInput = z.infer<typeof crearEpisodioSchema>;
export type ActualizarEpisodioInput = z.infer<typeof actualizarEpisodioSchema>;

// El front manda unas veces camelCase y otras snake_case (la fila tal cual viene de la BD)
const ALIAS_CAMEL: Record<string, string> = {
  enfermedadesHereditarias: 'enfermedades_hereditarias',
  consumoAgua: 'consumo_agua',
  lesionConsulta: 'lesion_consulta',
  objetivoPaciente: 'objetivo_paciente',
  evaluacionFisica: 'evaluacion_fisica',
  evaluacionFinal: 'evaluacion_final',
  sesionesProgramadas: 'sesiones_programadas',
  estadoTratamiento: 'estado_tratamiento',
};

export function normalizarCamposPaciente(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const normalizado: Record<string, unknown> = { ...body };
  for (const [camel, snake] of Object.entries(ALIAS_CAMEL)) {
    if (normalizado[snake] === undefined && normalizado[camel] !== undefined) normalizado[snake] = normalizado[camel];
  }
  return normalizado;
}
