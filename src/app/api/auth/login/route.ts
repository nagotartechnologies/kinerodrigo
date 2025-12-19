import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validar campos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1');
    const user = await stmt.get(email) as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    console.log('Usuario encontrado:', { id: user.id, email: user.email, hasPassword: !!user.password });
    const isValidPassword = comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token
    const userPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
    };

    const token = generateToken(userPayload);
    await setAuthCookie(token);

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      redirectUrl: '/dashboard',
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
