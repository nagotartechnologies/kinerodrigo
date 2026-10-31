import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, verifyAuth } from '@/lib/auth';

// Cuenta usuarios activos distintos del indicado (para no dejar el sistema sin acceso)
async function otrosUsuariosActivos(id: string): Promise<number> {
  const fila: any = await db.prepare('SELECT COUNT(*) as total FROM usuarios WHERE activo = 1 AND id != ?').get(id);
  return Number(fila?.total || 0);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, apellido, email, password, activo } = body;

    // Validar que al menos un campo esté presente
    if (!nombre && !apellido && !email && password === undefined && activo === undefined) {
      return NextResponse.json(
        { success: false, error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Construir la consulta de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (apellido !== undefined) {
      updates.push('apellido = ?');
      values.push(apellido);
    }
    if (email !== undefined) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Email inválido' },
          { status: 400 }
        );
      }
      
      // Verificar si el email ya existe en otro usuario
      const checkStmt = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?');
      const existingUser = await checkStmt.get(email, id);
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'El email ya está registrado' },
          { status: 400 }
        );
      }
      
      updates.push('email = ?');
      values.push(email);
    }
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      updates.push('password = ?');
      values.push(hashPassword(password));
    }
    if (activo !== undefined) {
      if (!activo) {
        if (String(auth.user?.id) === String(id)) {
          return NextResponse.json(
            { success: false, error: 'No puedes desactivar tu propio usuario' },
            { status: 400 }
          );
        }
        if (await otrosUsuariosActivos(id) === 0) {
          return NextResponse.json(
            { success: false, error: 'Debe quedar al menos un usuario activo' },
            { status: 400 }
          );
        }
      }
      updates.push('activo = ?');
      values.push(activo ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay cambios para actualizar' },
        { status: 400 }
      );
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`);
    await stmt.run(...values);

    // Obtener el usuario actualizado
    const getStmt = db.prepare('SELECT id, nombre, apellido, email, activo, created_at as createdAt FROM usuarios WHERE id = ?');
    const usuario = await getStmt.get(id);

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (String(auth.user?.id) === String(id)) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const checkStmt = db.prepare('SELECT id FROM usuarios WHERE id = ?');
    const usuario = await checkStmt.get(id);

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (await otrosUsuariosActivos(id) === 0) {
      return NextResponse.json(
        { success: false, error: 'Debe quedar al menos un usuario activo' },
        { status: 400 }
      );
    }

    // Eliminar usuario
    const stmt = db.prepare('DELETE FROM usuarios WHERE id = ?');
    await stmt.run(id);

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
