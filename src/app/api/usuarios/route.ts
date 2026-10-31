import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const stmt = db.prepare('SELECT id, nombre, apellido, email, activo, created_at as createdAt FROM usuarios ORDER BY created_at DESC');
    const usuarios = await stmt.all();

    return NextResponse.json({
      success: true,
      usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { nombre, apellido, email, password } = await request.json();

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const checkStmt = db.prepare('SELECT id FROM usuarios WHERE email = ?');
    const existingUser = await checkStmt.get(email);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = hashPassword(password);

    // Crear usuario
    const stmt = db.prepare(`
      INSERT INTO usuarios (nombre, apellido, email, password, activo, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `);

    const result = await stmt.run(nombre, apellido, email, hashedPassword);

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        id: Number(result.lastInsertRowid),
        nombre,
        apellido,
        email,
        activo: 1
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
