import { z } from 'zod';
import { textoRequerido } from './comunes';

const LARGO_MINIMO_PASSWORD = 6;

const emailSchema = z.string().trim().email('Email inválido').max(254);
const passwordSchema = z
  .string()
  .min(LARGO_MINIMO_PASSWORD, `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  .max(200);

export const crearUsuarioSchema = z.object({
  nombre: textoRequerido('El nombre', 100),
  apellido: textoRequerido('El apellido', 100),
  email: emailSchema,
  password: passwordSchema,
});

// Contraseña vacía = no cambiarla
export const actualizarUsuarioSchema = z
  .object({
    nombre: textoRequerido('El nombre', 100).optional(),
    apellido: textoRequerido('El apellido', 100).optional(),
    email: emailSchema.optional(),
    password: z.union([z.literal(''), passwordSchema]).optional(),
    activo: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  })
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined && valor !== ''), {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
