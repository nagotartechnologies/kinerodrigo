import { z } from 'zod';

export const PROVEEDORES_WHATSAPP = ['auto', 'greenapi', 'twilio', 'meta', 'wassenger', 'ultramsg'] as const;
export const ACCIONES_CRON = ['iniciar', 'detener', 'ejecutar'] as const;

export const cambiarProveedorSchema = z.object({
  provider: z.enum(PROVEEDORES_WHATSAPP, { error: 'Proveedor no válido' }),
});

export const credencialesProveedorSchema = z.object({
  provider: z.enum(PROVEEDORES_WHATSAPP, { error: 'Proveedor no válido' }).exclude(['auto']),
  credentials: z.record(z.string(), z.string().max(500), { error: 'Se requiere proveedor y credenciales' }),
});

// Se aceptan espacios, guiones y '+': el proveedor normaliza el número
export const telefonoPruebaSchema = z.object({
  telefono: z.string({ error: 'Se requiere un numero de telefono' }).regex(/^[+\d\s()-]{8,20}$/, 'Número de teléfono inválido'),
});

const MAX_CITAS_RECORDATORIO_MASIVO = 100;
const LARGO_MAXIMO_MENSAJE = 4096;

export const recordatoriosMasivosSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD').optional(),
  citaIds: z.array(z.coerce.number().int().positive()).max(MAX_CITAS_RECORDATORIO_MASIVO).optional(),
}).refine((d) => d.fecha || d.citaIds?.length, { message: 'Se requiere fecha o lista de citaIds' });

export const enviarRespuestaSchema = z.object({
  telefono: z.string({ error: 'Faltan datos' }).regex(/^[+\d\s()-]{8,20}$/, 'Número de teléfono inválido'),
  mensaje: z.string({ error: 'Faltan datos' }).min(1, 'Faltan datos').max(LARGO_MAXIMO_MENSAJE),
  recordatorioId: z.coerce.number().int().positive().nullish(),
});

export const accionCronSchema = z.object({
  accion: z.enum(ACCIONES_CRON, { error: 'Acción no válida' }),
});
