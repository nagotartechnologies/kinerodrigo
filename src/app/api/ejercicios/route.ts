import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import db from '@/lib/db';

// GET - Obtener todos los ejercicios de la biblioteca
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ejercicios: any[] = await db.prepare(`
      SELECT 
        id,
        nombre,
        descripcion,
        categoria,
        created_at
      FROM ejercicios
      ORDER BY nombre ASC
    `).all();

    return NextResponse.json({
      success: true,
      ejercicios
    });
  } catch (error: any) {
    console.error('Error al obtener ejercicios:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener ejercicios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo ejercicio en la biblioteca
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, categoria } = body;

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'El nombre del ejercicio es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un ejercicio con ese nombre
    const existente: any = await db.prepare(
      'SELECT id FROM ejercicios WHERE LOWER(nombre) = LOWER(?)'
    ).get(nombre.trim());

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un ejercicio con ese nombre' },
        { status: 400 }
      );
    }

    const result = await db.prepare(`
      INSERT INTO ejercicios (nombre, descripcion, categoria)
      VALUES (?, ?, ?)
    `).run(
      nombre.trim(),
      descripcion?.trim() || null,
      categoria?.trim() || null
    );

    return NextResponse.json({
      success: true,
      ejercicio: {
        id: Number(result.lastInsertRowid),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        categoria: categoria?.trim() || null
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear ejercicio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear ejercicio' },
      { status: 500 }
    );
  }
}
