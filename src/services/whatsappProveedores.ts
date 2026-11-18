import db from '@/lib/db';

const CLAVE_PROVEEDOR = 'whatsapp_provider';
const PROVEEDOR_POR_DEFECTO = 'auto';
const CATEGORIA = 'whatsapp';

// Campo del formulario -> clave en configuraciones, por proveedor
const MAPA_CREDENCIALES: Record<string, Record<string, string>> = {
  greenapi: { instanceId: 'greenapi_instance_id', apiToken: 'greenapi_token' },
  twilio: { accountSid: 'twilio_account_sid', authToken: 'twilio_auth_token', whatsappNumber: 'twilio_whatsapp_number' },
  meta: { phoneNumberId: 'meta_phone_number_id', accessToken: 'meta_access_token' },
  wassenger: { apiKey: 'wassenger_api_key', deviceId: 'wassenger_device_id' },
  ultramsg: { instanceId: 'ultramsg_instance_id', token: 'ultramsg_token' },
};

const UPSERT = `
  INSERT INTO configuraciones (clave, valor, descripcion, categoria) VALUES (?, ?, ?, ?)
  ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = CURRENT_TIMESTAMP`;

export async function proveedorActivo(): Promise<string> {
  const fila = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(CLAVE_PROVEEDOR);
  return fila?.valor ? String(fila.valor) : PROVEEDOR_POR_DEFECTO;
}

export async function cambiarProveedor(provider: string): Promise<void> {
  await db.prepare(UPSERT).run(CLAVE_PROVEEDOR, provider, 'Proveedor de WhatsApp activo (auto, greenapi, twilio, meta)', CATEGORIA);
}

// Solo se guardan los campos conocidos del proveedor, en una sola escritura atómica
export async function guardarCredenciales(provider: string, credenciales: Record<string, string>): Promise<void> {
  const mapa = MAPA_CREDENCIALES[provider] ?? {};
  const sentencias = Object.entries(mapa)
    .filter(([campo]) => credenciales[campo] !== undefined)
    .map(([campo, clave]) => ({ sql: UPSERT, args: [clave, credenciales[campo], `Credencial ${campo} para ${provider}`, CATEGORIA] }));
  if (sentencias.length) await db.batch(sentencias);
}
