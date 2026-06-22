import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const parseStart = Date.now();
    const { email, password } = await request.json();
    console.log(`⏱️ Parse JSON: ${Date.now() - parseStart}ms`);

    // Validar campos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const dbStart = Date.now();
    const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1');
    const user = await stmt.get(email) as any;
    console.log(`⏱️ DB Query: ${Date.now() - dbStart}ms`);

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const bcryptStart = Date.now();
    const isValidPassword = await comparePassword(password, user.password);
    console.log(`⏱️ Bcrypt compare: ${Date.now() - bcryptStart}ms`);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token
    const tokenStart = Date.now();
    const userPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
    };

    const token = generateToken(userPayload);
    await setAuthCookie(token);
    console.log(`⏱️ Token generation: ${Date.now() - tokenStart}ms`);

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user;

    console.log(`✅ Login total time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      redirectUrl: '/dashboard',
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    console.log(`⏱️ Total time (error): ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
