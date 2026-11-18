import db from '@/lib/db';
import { comparePassword, type UserPayload } from '@/lib/auth';

interface UsuarioPublico extends UserPayload {
  [campo: string]: unknown;
}

// Devuelve el usuario sin la contraseña, o null si las credenciales no calzan
export async function autenticar(email: string, password: string): Promise<UsuarioPublico | null> {
  const user = await db
    .prepare('SELECT * FROM usuarios WHERE lower(email) = lower(?) AND activo = 1')
    .get(email);
  if (!user || typeof user.password !== 'string') return null;

  const valida = await comparePassword(password, user.password);
  if (!valida) return null;

  const { password: _omitida, ...resto } = user;
  return {
    ...resto,
    id: Number(user.id),
    email: String(user.email),
    nombre: String(user.nombre),
    apellido: String(user.apellido),
  };
}
