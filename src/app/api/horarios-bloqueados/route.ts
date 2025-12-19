import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    
    let query = 'SELECT * FROM horarios_bloqueados';
    const params: any[] = [];
    
    if (fecha) {
      query += ' WHERE fecha = ?';
      params.push(fecha);
    }
    
    query += ' ORDER BY fecha, hora_inicio';
    
    const stmt = db.prepare(query);
    const horarios = await stmt.all(...params);
    
    return NextResponse.json({ success: true, horarios });
  } catch (error) {
    console.error('Error al obtener horarios bloqueados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener horarios bloqueados' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fecha, hora_inicio, hora_fin, motivo, tipo } = body;
    
    if (!fecha || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { success: false, error: 'Fecha, hora inicio y hora fin son requeridos' },
        { status: 400 }
      );
    }
    
    const stmt = db.prepare(
      `INSERT INTO horarios_bloqueados (fecha, hora_inicio, hora_fin, motivo, tipo)
       VALUES (?, ?, ?, ?, ?)`
    );
    
    const result = await stmt.run(fecha, hora_inicio, hora_fin, motivo || 'Bloqueado', tipo || 'bloqueo');
    
    const horario = await db.prepare('SELECT * FROM horarios_bloqueados WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ success: true, horario });
  } catch (error) {
    console.error('Error al crear horario bloqueado:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear horario bloqueado' },
      { status: 500 }
    );
  }
}
