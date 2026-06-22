import { schedule } from '@netlify/functions';
import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN son requeridos');
}

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

const BACKUP_TABLES = [
  'usuarios', 'pacientes', 'citas', 'sesiones', 'ejercicios',
  'recordatorios', 'pagos', 'configuraciones', 'horarios_bloqueados',
  'categorias_gastos', 'gastos', 'gastos_fijos', 'documentos_paciente',
  'historial_estados_paciente', 'evaluaciones', 'planes_rehabilitacion',
];

async function generarDumpSQL(): Promise<{ sql: string; stats: Record<string, number> }> {
  const lines: string[] = [];
  const stats: Record<string, number> = {};

  lines.push('-- Respaldo KINE-CITAS');
  lines.push(`-- Fecha: ${new Date().toISOString()}`);
  lines.push('-- Generado automaticamente por cron diario');
  lines.push('');
  lines.push('PRAGMA foreign_keys=OFF;');
  lines.push('BEGIN TRANSACTION;');
  lines.push('');

  for (const table of BACKUP_TABLES) {
    try {
      const schemaResult = await db.execute({
        sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        args: [table],
      });

      if (schemaResult.rows.length === 0) continue;
      const schemaSql = schemaResult.rows[0].sql as string;

      lines.push(`-- Tabla: ${table}`);
      lines.push(`DROP TABLE IF EXISTS ${table};`);
      lines.push(`${schemaSql};`);
      lines.push('');

      const dataResult = await db.execute({ sql: `SELECT * FROM ${table}`, args: [] });
      stats[table] = dataResult.rows.length;

      if (dataResult.rows.length === 0) {
        lines.push('-- (sin datos)');
        lines.push('');
        continue;
      }

      const columns = dataResult.columns;

      for (const row of dataResult.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number' || typeof val === 'bigint') return String(val);
          const escaped = String(val).replace(/'/g, "''");
          return `'${escaped}'`;
        });
        lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push('');
    } catch (err: any) {
      lines.push(`-- Error en tabla ${table}: ${err.message}`);
      stats[table] = -1;
    }
  }

  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys=ON;');

  return { sql: lines.join('\n'), stats };
}

async function subirACloudinary(sql: string, fileName: string): Promise<any> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary no configurado');
  }

  // Generar signature para upload
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    folder: 'kine-citas/backups',
    overwrite: 'true',
    public_id: fileName,
    resource_type: 'raw',
    timestamp: String(timestamp),
  };

  // Crear string para firmar (ordenado alfabeticamente)
  const toSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&') + apiSecret;

  // SHA1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Subir via API REST de Cloudinary
  const formData = new FormData();
  formData.append('file', new Blob([sql], { type: 'application/sql' }), `${fileName}.sql`);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', 'kine-citas/backups');
  formData.append('public_id', fileName);
  formData.append('overwrite', 'true');
  formData.append('resource_type', 'raw');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Ejecutar diariamente a las 03:00 UTC (00:00 Chile)
export const handler = schedule('0 3 * * *', async (event) => {
  console.log('🔄 [CRON] Iniciando respaldo diario automatico...');

  try {
    const { sql, stats } = await generarDumpSQL();

    const now = new Date();
    const fechaStr = now.toISOString().slice(0, 10);
    const fileName = `backup-${fechaStr}`;

    console.log(`📦 [CRON] Respaldo generado: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log('📊 [CRON] Estadisticas:', JSON.stringify(stats));

    const result = await subirACloudinary(sql, fileName);
    console.log(`✅ [CRON] Respaldo subido: ${result.secure_url}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Respaldo diario completado',
        url: result.secure_url,
        tamano: result.bytes,
        tablas: stats,
      }),
    };
  } catch (error: any) {
    console.error('❌ [CRON] Error en respaldo diario:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
});
