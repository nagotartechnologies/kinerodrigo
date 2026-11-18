import db, { initDatabase } from '@/lib/db';

export const MAX_INTENTOS_LOGIN = 5;
export const VENTANA_BLOQUEO_MINUTOS = 15;
// Los registros más viejos que esto ya no influyen y se purgan
const RETENCION_INTENTOS_HORAS = 24;

const VENTANA_SQL = `-${VENTANA_BLOQUEO_MINUTOS} minutes`;
const RETENCION_SQL = `-${RETENCION_INTENTOS_HORAS} hours`;

// Se limita por email + IP: bloquear solo por email permitiría que un tercero
// deje sin acceso al usuario real
export function claveIntento(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export function ipDeRequest(request: Request): string {
  const netlify = request.headers.get('x-nf-client-connection-ip');
  const reenviada = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return netlify || reenviada || 'desconocida';
}

export async function estaBloqueado(clave: string): Promise<boolean> {
  await initDatabase();
  const fila = await db
    .prepare(`SELECT COUNT(*) AS total FROM intentos_login WHERE clave = ? AND created_at >= datetime('now', ?)`)
    .get(clave, VENTANA_SQL);
  return Number(fila?.total ?? 0) >= MAX_INTENTOS_LOGIN;
}

export async function registrarFallo(clave: string): Promise<void> {
  await db.prepare('INSERT INTO intentos_login (clave) VALUES (?)').run(clave);
  await db.prepare(`DELETE FROM intentos_login WHERE created_at < datetime('now', ?)`).run(RETENCION_SQL);
}

export async function limpiarIntentos(clave: string): Promise<void> {
  await db.prepare('DELETE FROM intentos_login WHERE clave = ?').run(clave);
}
