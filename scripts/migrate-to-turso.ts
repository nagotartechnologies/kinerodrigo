import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ Error: TURSO_DATABASE_URL y TURSO_AUTH_TOKEN deben estar configurados en .env.local');
  process.exit(1);
}

async function migrateToTurso() {
  console.log('🚀 Iniciando migración de SQLite local a Turso...\n');

  // Conectar a SQLite local
  const localDbPath = path.join(process.cwd(), 'database.db');
  console.log(`📂 Leyendo base de datos local: ${localDbPath}`);
  const localDb = new Database(localDbPath, { readonly: true });

  // Conectar a Turso
  console.log(`☁️  Conectando a Turso: ${TURSO_URL}`);
  const tursoDb = createClient({
    url: TURSO_URL!,
    authToken: TURSO_AUTH_TOKEN!
  });

  try {
    // Deshabilitar foreign keys temporalmente en Turso
    console.log('🔓 Deshabilitando foreign keys temporalmente...');
    await tursoDb.execute('PRAGMA foreign_keys = OFF');

    // Orden correcto de tablas respetando foreign keys
    // 1. Tablas sin dependencias (padres)
    // 2. Tablas con dependencias (hijas)
    const tableOrder = [
      'usuarios',           // Sin dependencias
      'configuraciones',    // Sin dependencias
      'pacientes',          // Sin dependencias
      'citas',              // Depende de: pacientes
      'sesiones',           // Depende de: pacientes, citas
      'pagos',              // Depende de: pacientes, sesiones
      'evaluaciones',       // Depende de: pacientes
      'planes_rehabilitacion', // Depende de: pacientes
      'horarios_bloqueados', // Sin dependencias
      'recordatorios'       // Depende de: citas
    ];

    console.log(`\n📋 Tablas a migrar: ${tableOrder.length}`);
    tableOrder.forEach(t => console.log(`   - ${t}`));

    // Migrar cada tabla en orden
    for (const tableName of tableOrder) {
      console.log(`\n🔄 Migrando tabla: ${tableName}`);

      // Eliminar tabla si existe para evitar conflictos de esquema
      console.log(`   🗑️  Eliminando tabla existente si existe...`);
      try {
        await tursoDb.execute(`DROP TABLE IF EXISTS ${tableName}`);
      } catch (error: any) {
        console.log(`   ⚠️  Error al eliminar tabla (ignorando): ${error.message}`);
      }

      // Obtener esquema de la tabla
      const schema = localDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName) as { sql: string } | undefined;
      
      if (schema && schema.sql) {
        console.log(`   ✅ Creando estructura...`);
        await tursoDb.execute(schema.sql);
      }

      // Obtener datos
      const rows = localDb.prepare(`SELECT * FROM ${tableName}`).all();
      console.log(`   📊 Registros encontrados: ${rows.length}`);

      if (rows.length > 0 && rows[0]) {
        // Obtener columnas
        const columns = Object.keys(rows[0] as Record<string, any>);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Insertar datos en lotes
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => (row as any)[col]);
            await tursoDb.execute({
              sql: insertSql,
              args: values
            });
            inserted++;
          }

          console.log(`   ⏳ Progreso: ${inserted}/${rows.length} registros`);
        }

        console.log(`   ✅ Completado: ${inserted} registros migrados`);
      } else {
        console.log(`   ℹ️  Tabla vacía, omitiendo datos`);
      }
    }

    // Reactivar foreign keys
    console.log('\n🔒 Reactivando foreign keys...');
    await tursoDb.execute('PRAGMA foreign_keys = ON');

    console.log('\n✅ ¡Migración completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Verifica que las variables estén en .env.local');
    console.log('   2. Reinicia tu servidor Next.js');
    console.log('   3. La aplicación usará automáticamente Turso\n');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    localDb.close();
  }
}

migrateToTurso();
