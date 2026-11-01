import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener todas las categorias
export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const categorias = await db.prepare('SELECT * FROM categorias_gastos ORDER BY nombre').all();
    return NextResponse.json({ success: true, categorias });
  } catch (error: any) {
    console.error('Error al obtener categorias:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener categorias' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva categoria
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await request.json();
    const { nombre, color } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const result = await db.prepare(
      'INSERT INTO categorias_gastos (nombre, color) VALUES (?, ?)'
    ).run(nombre.trim(), color || '#6b7280');

    const categoria = await db.prepare('SELECT * FROM categorias_gastos WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ success: true, categoria, message: 'Categoria creada' });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoria con ese nombre' },
        { status: 400 }
      );
    }
    console.error('Error al crear categoria:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear categoria' },
      { status: 500 }
    );
  }
}
