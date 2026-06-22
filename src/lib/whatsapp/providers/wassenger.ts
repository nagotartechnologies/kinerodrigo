// Proveedor Wassenger
import db from '@/lib/db';
import { 
  WhatsAppProvider, 
  SendMessageParams, 
  SendMessageWithButtonsParams,
  SendFileParams,
  SendMessageResponse,
  cleanPhoneNumber 
} from './base';

export class WassengerProvider implements WhatsAppProvider {
  name = 'Wassenger';

  private async getConfig(clave: string, defaultValue: string = ''): Promise<string> {
    try {
      const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
      return config?.valor || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  private async getCredentials() {
    const apiKey = await this.getConfig('wassenger_api_key', '');
    const deviceId = await this.getConfig('wassenger_device_id', '');
    return { apiKey, deviceId };
  }

  async isConfigured(): Promise<boolean> {
    const { apiKey, deviceId } = await this.getCredentials();
    return !!(apiKey && deviceId);
  }

  async sendMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
    const { apiKey, deviceId } = await this.getCredentials();
    
    if (!apiKey || !deviceId) {
      throw new Error('Wassenger no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://api.wassenger.com/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device: deviceId,
        phone: phoneWithCountry,
        message: message
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje de WhatsApp (Wassenger): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.id || `WASSENGER_${Date.now()}`,
      provider: this.name
    };
  }

  async sendMessageWithButtons({ phone, message, buttons }: SendMessageWithButtonsParams): Promise<SendMessageResponse> {
    const { apiKey, deviceId } = await this.getCredentials();
    
    if (!apiKey || !deviceId) {
      throw new Error('Wassenger no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://api.wassenger.com/v1/messages`;

    // Wassenger soporta botones interactivos
    const wassengerButtons = buttons.map(btn => ({
      id: btn.buttonId,
      text: btn.buttonText
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device: deviceId,
        phone: phoneWithCountry,
        message: message,
        buttons: wassengerButtons
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('⚠️ Wassenger botones falló, intentando mensaje normal...');
      // Fallback: enviar mensaje normal sin botones
      return this.sendMessage({ phone, message });
    }

    const result = await response.json();
    
    return {
      idMessage: result.id || `WASSENGER_BTN_${Date.now()}`,
      provider: this.name
    };
  }

  async sendFile({ phone, fileUrl, caption }: SendFileParams): Promise<SendMessageResponse> {
    const { apiKey, deviceId } = await this.getCredentials();
    
    if (!apiKey || !deviceId) {
      throw new Error('Wassenger no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://api.wassenger.com/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device: deviceId,
        phone: phoneWithCountry,
        media: fileUrl,
        message: caption || ''
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar archivo (Wassenger): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.id || `WASSENGER_FILE_${Date.now()}`,
      provider: this.name
    };
  }
}
