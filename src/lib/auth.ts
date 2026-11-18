import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Se lee al usarse (no al importar) para que el build no falle si la variable
// solo existe en runtime; sin secreto no se firma ni se acepta ningún token
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurada. Agrégala en .env.local y en las variables de Netlify.');
  }
  return secret;
}

// 12 es el costo recomendado hoy; los hashes antiguos (costo 8) siguen validando
const BCRYPT_COSTO = 12;

export interface UserPayload {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_COSTO);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Duración de la sesión: 30 días con "Recordarme", 1 día sin él
export const DIAS_SESION_RECORDADA = 30;
export const DIAS_SESION_NORMAL = 1;

export function generateToken(user: UserPayload, dias: number = 7): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: `${dias}d` });
}

export function verifyToken(token: string): UserPayload | null {
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret) as UserPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string, dias: number = 7) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * dias,
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}

// Sin try/catch a propósito: si falta JWT_SECRET el error debe verse como 500
// en vez de disfrazarse de "No autorizado"
export async function verifyAuth(request: Request): Promise<{ authenticated: boolean; user?: UserPayload }> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return { authenticated: false };
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const token = cookies['auth-token'];
  if (!token) {
    return { authenticated: false };
  }

  const user = verifyToken(token);
  return user ? { authenticated: true, user } : { authenticated: false };
}

// Devuelve una respuesta 401 si no hay sesión válida, o null si la hay
export async function requireAuth(request: Request): Promise<NextResponse | null> {
  const { authenticated } = await verifyAuth(request);
  return authenticated ? null : NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
