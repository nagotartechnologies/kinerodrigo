import { schedule } from '@netlify/functions';

// La lógica de recordatorios vive en src/lib/cron.ts. Esta función solo la dispara
// llamando a /api/cron/recordatorios con CRON_SECRET, para no duplicar código.
// Netlify define process.env.URL con la URL principal del sitio.
export const handler = schedule('0 */2 * * *', async () => {
  console.log('🚀 [NETLIFY CRON] Iniciando ejecución programada de recordatorios', new Date().toISOString());

  const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!baseUrl || !cronSecret) {
    const error = 'Faltan las variables URL/NEXT_PUBLIC_APP_URL o CRON_SECRET';
    console.error(`❌ [NETLIFY CRON] ${error}`);
    return { statusCode: 500, body: JSON.stringify({ success: false, error }) };
  }

  try {
    const response = await fetch(`${baseUrl}/api/cron/recordatorios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret },
      body: JSON.stringify({ accion: 'ejecutar' }),
    });
    const body = await response.text();
    console.log(`📊 [NETLIFY CRON] Respuesta ${response.status}: ${body}`);
    return { statusCode: response.status, body };
  } catch (error: any) {
    console.error('❌ [NETLIFY CRON] Error fatal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message, timestamp: new Date().toISOString() }),
    };
  }
});
