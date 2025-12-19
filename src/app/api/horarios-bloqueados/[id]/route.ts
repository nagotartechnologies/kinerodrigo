import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    const stmt = db.prepare('DELETE FROM horarios_bloqueados WHERE id = ?');
    stmt.run(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar horario bloqueado:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar horario bloqueado' },
      { status: 500 }
    );
  }
}
