import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Ejecutar migración de columnas en recordatorios
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Iniciando migración de tabla recordatorios...');

    // Verificar si las columnas ya existen
    const tableInfo: any[] = await db.prepare('PRAGMA table_info(recordatorios)').all();
    const columnNames = tableInfo.map((col: any) => col.name);

    console.log('📋 Columnas actuales:', columnNames);

    const columnasNecesarias = [
      'mensaje_respuesta_id',
      'mensaje_respuesta_enviado',
      'error_respuesta'
    ];

    const columnasAgregar = columnasNecesarias.filter(col => !columnNames.includes(col));

    if (columnasAgregar.length === 0) {
      console.log('✅ Todas las columnas ya existen');
      return NextResponse.json({
        success: true,
        message: 'Todas las columnas ya existen',
        columnas: columnNames
      });
    }

    console.log('➕ Agregando columnas:', columnasAgregar);

    // Agregar columnas faltantes
    if (columnasAgregar.includes('mensaje_respuesta_id')) {
      db.exec('ALTER TABLE recordatorios ADD COLUMN mensaje_respuesta_id TEXT');
      console.log('✅ Columna mensaje_respuesta_id agregada');
    }

    if (columnasAgregar.includes('mensaje_respuesta_enviado')) {
      db.exec('ALTER TABLE recordatorios ADD COLUMN mensaje_respuesta_enviado INTEGER DEFAULT 0');
      console.log('✅ Columna mensaje_respuesta_enviado agregada');
    }

    if (columnasAgregar.includes('error_respuesta')) {
      db.exec('ALTER TABLE recordatorios ADD COLUMN error_respuesta TEXT');
      console.log('✅ Columna error_respuesta agregada');
    }

    // Verificar nuevamente
    const tableInfoAfter: any[] = await db.prepare('PRAGMA table_info(recordatorios)').all();
    const columnNamesAfter = tableInfoAfter.map((col: any) => col.name);

    console.log('📋 Columnas después de migración:', columnNamesAfter);

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      columnasAgregadas: columnasAgregar,
      columnasActuales: columnNamesAfter
    });

  } catch (error: any) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al ejecutar migración' 
      },
      { status: 500 }
    );
  }
}
