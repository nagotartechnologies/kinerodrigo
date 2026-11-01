import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';

export interface UserPayload {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 8);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Duración de la sesión: 30 días con "Recordarme", 1 día sin él
export const DIAS_SESION_RECORDADA = 30;
export const DIAS_SESION_NORMAL = 1;

export function generateToken(user: UserPayload, dias: number = 7): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: `${dias}d` });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
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

export async function verifyAuth(request: Request): Promise<{ authenticated: boolean; user?: UserPayload }> {
  try {
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
    if (!user) {
      return { authenticated: false };
    }

    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false };
  }
}

// Devuelve una respuesta 401 si no hay sesión válida, o null si la hay
export async function requireAuth(request: Request): Promise<NextResponse | null> {
  const { authenticated } = await verifyAuth(request);
  return authenticated ? null : NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
