// Proveedor Twilio
import db from '@/lib/db';
import { 
  WhatsAppProvider, 
  SendMessageParams, 
  SendMessageWithButtonsParams,
  SendMessageResponse,
  cleanPhoneNumber 
} from './base';

export class TwilioProvider implements WhatsAppProvider {
  name = 'Twilio';

  private async getConfig(clave: string, defaultValue: string = ''): Promise<string> {
    try {
      const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
      return config?.valor || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  private async getCredentials() {
    const accountSid = await this.getConfig('twilio_account_sid', '');
    const authToken = await this.getConfig('twilio_auth_token', '');
    const fromNumber = await this.getConfig('twilio_whatsapp_number', '');
    return { accountSid, authToken, fromNumber };
  }

  async isConfigured(): Promise<boolean> {
    const { accountSid, authToken, fromNumber } = await this.getCredentials();
    return !!(accountSid && authToken && fromNumber);
  }

  async sendMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
    const { accountSid, authToken, fromNumber } = await this.getCredentials();
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const toNumber = `whatsapp:+${phoneWithCountry}`;
    
    // Formatear el número From correctamente
    let from = fromNumber;
    if (!from.startsWith('whatsapp:')) {
      // Si no tiene whatsapp: agregarlo
      if (from.startsWith('+')) {
        from = `whatsapp:${from}`;
      } else {
        from = `whatsapp:+${from}`;
      }
    }

    // Twilio usa Basic Auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', from);
    formData.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje de WhatsApp (Twilio): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.sid || `TWILIO_${Date.now()}`,
      provider: this.name
    };
  }

  async sendMessageWithButtons({ phone, message, buttons }: SendMessageWithButtonsParams): Promise<SendMessageResponse> {
    const { accountSid, authToken, fromNumber } = await this.getCredentials();
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const toNumber = `whatsapp:+${phoneWithCountry}`;
    
    // Formatear el número From correctamente
    let from = fromNumber;
    if (!from.startsWith('whatsapp:')) {
      // Si no tiene whatsapp: agregarlo
      if (from.startsWith('+')) {
        from = `whatsapp:${from}`;
      } else {
        from = `whatsapp:+${from}`;
      }
    }

    // Twilio usa Basic Auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Construir el mensaje con botones en formato de lista numerada
    const buttonsList = buttons.map((btn, index) => `${index + 1}. ${btn.buttonText}`).join('\n');
    const fullMessage = `${message}\n\n${buttonsList}\n\nResponde con el número de tu opción.`;

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', from);
    formData.append('Body', fullMessage);

    // Agregar botones como respuestas rápidas (Quick Reply Buttons)
    // Formato: ButtonText:ButtonPayload
    buttons.forEach((btn, index) => {
      formData.append('PersistentAction', `${btn.buttonText}:${btn.buttonId}`);
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('⚠️ Twilio botones falló, intentando mensaje normal...');
      // Fallback: enviar mensaje normal sin botones
      return this.sendMessage({ phone, message: fullMessage });
    }

    const result = await response.json();
    
    return {
      idMessage: result.sid || `TWILIO_BTN_${Date.now()}`,
      provider: this.name
    };
  }
}
