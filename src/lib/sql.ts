import type { InValue } from '@libsql/client/web';
import type { SentenciaBatch } from './db';

interface OpcionesUpdate {
  // Algunas tablas (gastos, gastos_fijos) no tienen columna updated_at
  conTimestamp?: boolean;
}

/**
 * Arma un UPDATE solo con los campos definidos (undefined = no tocar).
 * Las claves de `campos` deben venir de literales del código, nunca del input
 * del usuario: se interpolan como nombres de columna.
 */
export function sentenciaUpdate(
  tabla: string,
  campos: Record<string, InValue | undefined>,
  id: number,
  { conTimestamp = true }: OpcionesUpdate = {}
): SentenciaBatch | null {
  const definidos = Object.entries(campos).filter((entrada): entrada is [string, InValue] => entrada[1] !== undefined);
  if (definidos.length === 0) return null;
  const sets = definidos.map(([columna]) => `${columna} = ?`);
  if (conTimestamp) sets.push('updated_at = CURRENT_TIMESTAMP');
  return { sql: `UPDATE ${tabla} SET ${sets.join(', ')} WHERE id = ?`, args: [...definidos.map(([, valor]) => valor), id] };
}
