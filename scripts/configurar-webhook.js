const INSTANCE_ID = "7107385784";
const API_TOKEN = "c23cacd32f844a1abba0c88587408033ea3a7f08e7634072a7";
const WEBHOOK_URL = "https://unpluralised-gaston-illusively.ngrok-free.dev/api/webhook/whatsapp";

async function configurarWebhook() {
  try {
    console.log('🔧 Configurando webhook en Green API...');
    
    const response = await fetch(
      `https://7107.api.green-api.com/waInstance${INSTANCE_ID}/setSettings/${API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: WEBHOOK_URL,
          webhookUrlToken: "",
          incomingWebhook: "yes",
          outgoingWebhook: "yes",
          outgoingMessageWebhook: "yes",
          outgoingAPIMessageWebhook: "yes",
        })
      }
    );

    const data = await response.json();
    console.log('✅ Respuesta:', data);

    if (data.saveSettings) {
      console.log('✅ Webhook configurado exitosamente!');
      console.log('📍 URL:', WEBHOOK_URL);
    } else {
      console.log('❌ Error al configurar webhook');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configurarWebhook();
