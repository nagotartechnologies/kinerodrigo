import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST - Migrar valores null de dolor a 0 en sesiones
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando migración de valores de dolor en sesiones...');

    // Actualizar dolor_inicial null a 0
    const resultInicial = await db.prepare(`
      UPDATE sesiones 
      SET dolor_inicial = 0 
      WHERE dolor_inicial IS NULL
    `).run();

    console.log(`✅ Actualizados ${resultInicial.changes} registros de dolor_inicial`);

    // Actualizar dolor_final null a 0
    const resultFinal = await db.prepare(`
      UPDATE sesiones 
      SET dolor_final = 0 
      WHERE dolor_final IS NULL
    `).run();

    console.log(`✅ Actualizados ${resultFinal.changes} registros de dolor_final`);

    return NextResponse.json({
      success: true,
      message: 'Migración de valores de dolor completada',
      dolorInicialActualizado: resultInicial.changes,
      dolorFinalActualizado: resultFinal.changes
    });

  } catch (error: any) {
    console.error('❌ Error en migración de dolor:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al ejecutar migración de dolor' 
      },
      { status: 500 }
    );
  }
}

// PUT - Quitar UNIQUE constraint del campo rut en pacientes
// Técnica dinámica: leer SQL original, quitar UNIQUE, recrear tabla
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Recreando tabla pacientes sin UNIQUE en rut...');

    // 1. Obtener el CREATE TABLE original de sqlite_master
    const tableDef: any = await db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='pacientes'"
    ).get();
    
    if (!tableDef?.sql) {
      return NextResponse.json({ success: false, error: 'No se encontró la tabla pacientes' }, { status: 404 });
    }

    const sqlOriginal = tableDef.sql;
    console.log('📋 SQL original:', sqlOriginal);

    // 2. Quitar UNIQUE de la definición y crear como pacientes_new
    const sqlNuevo = sqlOriginal
      .replace('CREATE TABLE pacientes', 'CREATE TABLE pacientes_new')
      .replace(/rut TEXT UNIQUE NOT NULL/i, 'rut TEXT')
      .replace(/rut TEXT UNIQUE/i, 'rut TEXT');
    
    console.log('📋 SQL nuevo:', sqlNuevo);

    // Limpiar tabla temporal si quedó de un intento anterior
    await db.prepare('DROP TABLE IF EXISTS pacientes_new').run();

    // 3. Crear tabla nueva
    await db.prepare(sqlNuevo).run();
    console.log('✅ Tabla pacientes_new creada');

    // 4. Obtener columnas y copiar datos
    const tableInfo: any[] = await db.prepare('PRAGMA table_info(pacientes)').all();
    const columnas = tableInfo.map((c: any) => c.name).join(', ');
    
    await db.prepare(`INSERT INTO pacientes_new (${columnas}) SELECT ${columnas} FROM pacientes`).run();
    const count: any = await db.prepare('SELECT COUNT(*) as total FROM pacientes_new').get();
    console.log(`✅ ${count.total} pacientes copiados`);

    // 5. Eliminar tabla vieja y renombrar
    await db.prepare('DROP TABLE pacientes').run();
    await db.prepare('ALTER TABLE pacientes_new RENAME TO pacientes').run();
    console.log('✅ Tabla renombrada a pacientes');

    // 6. Verificar
    const newDef: any = await db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='pacientes'"
    ).get();

    return NextResponse.json({
      success: true,
      message: `Tabla pacientes recreada sin UNIQUE en rut. ${count.total} pacientes migrados.`,
      sqlAnterior: sqlOriginal,
      sqlNuevo: newDef?.sql
    });
  } catch (error: any) {
    console.error('❌ Error en migración de pacientes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error en migración' },
      { status: 500 }
    );
  }
}

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
