import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import db from '@/lib/db';

// PUT - Actualizar ejercicio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, categoria } = body;

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'El nombre del ejercicio es requerido' },
        { status: 400 }
      );
    }

    // Verificar si existe otro ejercicio con el mismo nombre
    const existente: any = await db.prepare(
      'SELECT id FROM ejercicios WHERE LOWER(nombre) = LOWER(?) AND id != ?'
    ).get(nombre.trim(), id);

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe otro ejercicio con ese nombre' },
        { status: 400 }
      );
    }

    await db.prepare(`
      UPDATE ejercicios
      SET nombre = ?,
          descripcion = ?,
          categoria = ?
      WHERE id = ?
    `).run(
      nombre.trim(),
      descripcion?.trim() || null,
      categoria?.trim() || null,
      id
    );

    return NextResponse.json({
      success: true,
      message: 'Ejercicio actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar ejercicio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar ejercicio' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar ejercicio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    await db.prepare('DELETE FROM ejercicios WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Ejercicio eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar ejercicio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar ejercicio' },
      { status: 500 }
    );
  }
}
