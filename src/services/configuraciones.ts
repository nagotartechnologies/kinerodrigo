import db from '@/lib/db';
import type { ValorConfig } from '@/lib/schemas/configuracion';

// Categoría de las claves nuevas: hoy solo las crea la configuración de WhatsApp
const CATEGORIA_CLAVE_NUEVA = 'whatsapp';

function serializar(valor: ValorConfig, tipo: string): string {
  if (tipo === 'boolean') return valor ? 'true' : 'false';
  return valor === null ? '' : String(valor);
}

function tipoInferido(valor: ValorConfig): string {
  if (typeof valor === 'boolean') return 'boolean';
  if (typeof valor === 'number') return 'number';
  return 'text';
}

export async function listarConfiguraciones(categoria?: string | null) {
  const filas = categoria
    ? await db.prepare('SELECT * FROM configuraciones WHERE categoria = ? ORDER BY categoria, clave').all(categoria)
    : await db.prepare('SELECT * FROM configuraciones ORDER BY categoria, clave').all();
  return filas.map((config) => ({ ...config, valor: config.tipo === 'boolean' ? config.valor === 'true' : config.valor }));
}

// Crea o actualiza una clave; respeta el tipo ya registrado
export async function guardarConfiguracion(clave: string, valor: ValorConfig): Promise<{ creada: boolean }> {
  const existente = await db.prepare('SELECT tipo FROM configuraciones WHERE clave = ?').get(clave);
  const tipo = existente ? String(existente.tipo) : tipoInferido(valor);
  await db.prepare(`
    INSERT INTO configuraciones (clave, valor, tipo, categoria, descripcion, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP
  `).run(clave, serializar(valor, tipo), tipo, CATEGORIA_CLAVE_NUEVA, `Configuración de ${clave}`);
  return { creada: !existente };
}

// Actualiza solo claves existentes: 1 lectura para los tipos y 1 escritura atómica
export async function guardarConfiguraciones(configs: { clave: string; valor: ValorConfig }[]): Promise<void> {
  if (configs.length === 0) return;
  const placeholders = configs.map(() => '?').join(', ');
  const filas = await db.prepare(`SELECT clave, tipo FROM configuraciones WHERE clave IN (${placeholders})`)
    .all(...configs.map((c) => c.clave));
  const tipos = new Map(filas.map((fila) => [String(fila.clave), String(fila.tipo)]));

  const sentencias = configs
    .filter((c) => tipos.has(c.clave))
    .map((c) => ({
      sql: 'UPDATE configuraciones SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?',
      args: [serializar(c.valor, tipos.get(c.clave) ?? 'text'), c.clave],
    }));
  if (sentencias.length) await db.batch(sentencias);
}

export async function leerConfiguracion(clave: string): Promise<string> {
  const fila = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
  return fila?.valor ? String(fila.valor) : '';
}
