import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Crear tabla de ejercicios (mismo que POST para facilitar ejecución desde navegador)
export async function GET(request: NextRequest) {
  return ejecutarMigracion();
}

// POST - Crear tabla de ejercicios
export async function POST(request: NextRequest) {
  return ejecutarMigracion();
}

async function ejecutarMigracion() {
  try {
    console.log('🔄 Iniciando migración: creando tabla ejercicios...');

    // Crear tabla de ejercicios
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ejercicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        categoria TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabla ejercicios creada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Tabla de ejercicios creada exitosamente. La biblioteca está vacía y lista para agregar ejercicios personalizados.'
    });

  } catch (error: any) {
    console.error('❌ Error en migración de ejercicios:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear tabla de ejercicios' 
      },
      { status: 500 }
    );
  }
}
