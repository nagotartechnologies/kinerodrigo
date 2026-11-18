import { z } from 'zod';

// No se valida formato de email: basta con que coincida con el usuario guardado
export const loginSchema = z.object({
  email: z.string({ error: 'El email es requerido' }).trim().min(1, 'El email es requerido').max(254),
  password: z.string({ error: 'La contraseña es requerida' }).min(1, 'La contraseña es requerida').max(200),
  recordarme: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
