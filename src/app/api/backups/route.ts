import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import cloudinary from '@/lib/cloudinary';
import { verifyAuth } from '@/lib/auth';

const BACKUP_TABLES = [
  'usuarios',
  'pacientes',
  'citas',
  'sesiones',
  'ejercicios',
  'recordatorios',
  'pagos',
  'configuraciones',
  'horarios_bloqueados',
  'categorias_gastos',
  'gastos',
  'gastos_fijos',
  'documentos_paciente',
  'historial_estados_paciente',
  'evaluaciones',
  'planes_rehabilitacion',
];

/**
 * Genera un dump SQL completo de la base de datos
 */
async function generarDumpSQL(): Promise<{ sql: string; stats: Record<string, number> }> {
  const lines: string[] = [];
  const stats: Record<string, number> = {};

  lines.push('-- Respaldo KINE-CITAS');
  lines.push(`-- Fecha: ${new Date().toISOString()}`);
  lines.push('-- Generado automaticamente');
  lines.push('');
  lines.push('PRAGMA foreign_keys=OFF;');
  lines.push('BEGIN TRANSACTION;');
  lines.push('');

  for (const table of BACKUP_TABLES) {
    try {
      // Obtener schema de la tabla
      const schemaDef: any = await db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);

      if (!schemaDef?.sql) continue;

      lines.push(`-- Tabla: ${table}`);
      lines.push(`DROP TABLE IF EXISTS ${table};`);
      lines.push(`${schemaDef.sql};`);
      lines.push('');

      // Obtener datos
      const rows: any[] = await db.prepare(`SELECT * FROM ${table}`).all();
      stats[table] = rows.length;

      if (rows.length === 0) {
        lines.push(`-- (sin datos)`);
        lines.push('');
        continue;
      }

      // Obtener nombres de columnas
      const columns = Object.keys(rows[0]);

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          const escaped = String(val).replace(/'/g, "''");
          return `'${escaped}'`;
        });
        lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push('');
    } catch (err: any) {
      lines.push(`-- Error en tabla ${table}: ${err.message}`);
      lines.push('');
      stats[table] = -1;
    }
  }

  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys=ON;');

  return { sql: lines.join('\n'), stats };
}

// GET - Listar respaldos disponibles en Cloudinary
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'kine-citas/backups/',
      resource_type: 'raw',
      max_results: 30,
    });

    const backups = result.resources.map((r: any) => ({
      id: r.public_id,
      url: r.secure_url,
      fecha: r.created_at,
      tamano: r.bytes,
      nombre: r.public_id.split('/').pop(),
    })).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    console.error('Error listando backups:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al listar respaldos' },
      { status: 500 }
    );
  }
}

// POST - Crear respaldo y subir a Cloudinary
export async function POST(request: NextRequest) {
  try {
    // Permitir llamadas internas (cron) sin auth via header secreto
    const cronSecret = request.headers.get('x-cron-secret');
    const isInternalCall = cronSecret === process.env.TURSO_AUTH_TOKEN;

    if (!isInternalCall) {
      const authResult = await verifyAuth(request);
      if (!authResult.authenticated) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    console.log('🔄 Generando respaldo de base de datos...');
    const { sql, stats } = await generarDumpSQL();

    const now = new Date();
    const fechaStr = now.toISOString().slice(0, 10);
    const horaStr = now.toISOString().slice(11, 16).replace(':', '');
    const fileName = `backup-${fechaStr}-${horaStr}`;

    console.log(`📦 Subiendo respaldo a Cloudinary: ${fileName} (${(sql.length / 1024).toFixed(1)} KB)`);

    // Subir a Cloudinary como archivo raw
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: `kine-citas/backups/${fileName}`,
          format: 'sql',
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(Buffer.from(sql, 'utf-8'));
    });

    console.log(`✅ Respaldo subido: ${uploadResult.secure_url}`);

    // Limpiar backups antiguos (mantener ultimos 15)
    try {
      const existing = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'kine-citas/backups/',
        resource_type: 'raw',
        max_results: 50,
      });

      const sorted = existing.resources.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (sorted.length > 15) {
        const toDelete = sorted.slice(15);
        for (const old of toDelete) {
          await cloudinary.uploader.destroy(old.public_id, { resource_type: 'raw' });
          console.log(`🗑️ Backup antiguo eliminado: ${old.public_id}`);
        }
      }
    } catch (cleanupErr: any) {
      console.warn('⚠️ Error limpiando backups antiguos:', cleanupErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Respaldo creado exitosamente',
      backup: {
        nombre: fileName,
        url: uploadResult.secure_url,
        tamano: uploadResult.bytes,
        fecha: now.toISOString(),
        tablas: stats,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creando respaldo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear respaldo' },
      { status: 500 }
    );
  }
}
