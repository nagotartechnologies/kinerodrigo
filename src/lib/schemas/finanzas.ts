import { z } from 'zod';
import { fechaSchema, idSchema, textoRequerido } from './comunes';

const LARGO_TEXTO = 2000;
const DIA_MAXIMO_MES = 31;

const aNumero = (valor: unknown) => (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor);
// En las ediciones de finanzas un campo vacío significa "no cambiar" (comportamiento histórico)
const vacioAUndefined = (valor: unknown) => (valor === '' || valor === null ? undefined : valor);

const montoPositivo = z.preprocess(aNumero, z.number({ error: 'El monto es requerido' }).positive('El monto debe ser mayor a 0'));
const textoLibre = z.string().max(LARGO_TEXTO).nullish();
const opcionalSiVacio = <T extends z.ZodType>(schema: T) => z.preprocess(vacioAUndefined, schema.optional());
const idOpcional = z.preprocess((v) => (v === '' || v === undefined ? null : v), idSchema.nullable());

export const crearPagoSchema = z.object({
  pacienteId: idSchema,
  sesionId: idOpcional.optional(),
  // Citas registra el pago desde la cita: el servicio lo traduce a su sesión
  citaId: idOpcional.optional(),
  monto: montoPositivo,
  metodoPago: textoRequerido('El método de pago', 50),
  estado: z.string().max(30).optional(),
  fechaPago: fechaSchema,
  concepto: textoLibre,
  notas: textoLibre,
  numeroFactura: z.string().max(100).nullish(),
});

export const actualizarPagoSchema = z.object({
  monto: opcionalSiVacio(montoPositivo),
  metodoPago: opcionalSiVacio(z.string().max(50)),
  estado: opcionalSiVacio(z.string().max(30)),
  fechaPago: opcionalSiVacio(fechaSchema),
  // Finanzas edita sin mostrar notas ni factura y las manda vacías: no deben borrarse
  concepto: opcionalSiVacio(z.string().max(LARGO_TEXTO)),
  notas: opcionalSiVacio(z.string().max(LARGO_TEXTO)),
  numeroFactura: opcionalSiVacio(z.string().max(100)),
});

export const crearGastoSchema = z.object({
  categoria: textoRequerido('La categoría', 100),
  descripcion: textoRequerido('La descripción', 500),
  monto: montoPositivo,
  estado: z.string().max(30).optional(),
  fechaGasto: fechaSchema,
  metodoPago: z.string().max(50).nullish(),
  notas: textoLibre,
  gastoFijoId: idOpcional.optional(),
});

export const actualizarGastoSchema = z.object({
  categoria: opcionalSiVacio(z.string().max(100)),
  descripcion: opcionalSiVacio(z.string().max(500)),
  monto: opcionalSiVacio(montoPositivo),
  estado: opcionalSiVacio(z.string().max(30)),
  fechaGasto: opcionalSiVacio(fechaSchema),
  metodoPago: opcionalSiVacio(z.string().max(50)),
  notas: opcionalSiVacio(z.string().max(LARGO_TEXTO)),
});

const diaGeneracion = z.preprocess(aNumero, z.number().int().min(1).max(DIA_MAXIMO_MES, `El día debe estar entre 1 y ${DIA_MAXIMO_MES}`));

export const crearGastoFijoSchema = z.object({
  categoria: textoRequerido('La categoría', 100),
  descripcion: textoRequerido('La descripción', 500),
  monto: montoPositivo,
  diaGeneracion: opcionalSiVacio(diaGeneracion),
});

export const actualizarGastoFijoSchema = z.object({
  categoria: opcionalSiVacio(z.string().max(100)),
  descripcion: opcionalSiVacio(z.string().max(500)),
  monto: opcionalSiVacio(montoPositivo),
  activo: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  diaGeneracion: opcionalSiVacio(diaGeneracion),
});

export const mesSchema = z.string({ error: 'Parametro mes requerido (YYYY-MM)' }).regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato AAAA-MM');

export const crearCategoriaSchema = z.object({
  nombre: textoRequerido('El nombre', 100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').optional(),
});

// Tope por petición para no pasar el timeout de las funciones de Netlify:
// el cliente envía la selección en tandas de este tamaño
export const MAX_RECORDATORIOS_PAGO_POR_ENVIO = 10;

export const enviarRecordatoriosPagoSchema = z.object({
  pacienteIds: z.array(idSchema, { error: 'Selecciona al menos un paciente' })
    .min(1, 'Selecciona al menos un paciente')
    .max(MAX_RECORDATORIOS_PAGO_POR_ENVIO, `Máximo ${MAX_RECORDATORIOS_PAGO_POR_ENVIO} pacientes por envío`),
});

export type EnviarRecordatoriosPagoInput = z.infer<typeof enviarRecordatoriosPagoSchema>;
export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
export type ActualizarPagoInput = z.infer<typeof actualizarPagoSchema>;
export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type ActualizarGastoInput = z.infer<typeof actualizarGastoSchema>;
export type CrearGastoFijoInput = z.infer<typeof crearGastoFijoSchema>;
export type ActualizarGastoFijoInput = z.infer<typeof actualizarGastoFijoSchema>;
