// Proveedor Green API
import db from '@/lib/db';
import { 
  WhatsAppProvider, 
  SendMessageParams, 
  SendMessageWithButtonsParams,
  SendFileParams,
  SendMessageResponse,
  cleanPhoneNumber 
} from './base';

export class GreenAPIProvider implements WhatsAppProvider {
  name = 'Green API';

  private cachedCredentials: { instanceId: string; apiToken: string } | null = null;
  private cacheTimestamp = 0;

  private async getConfig(clave: string, defaultValue: string = ''): Promise<string> {
    try {
      const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
      return config?.valor || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  private async getCredentials() {
    // Cache por 5 minutos para evitar queries extra a Turso
    if (this.cachedCredentials && Date.now() - this.cacheTimestamp < 300000) {
      return this.cachedCredentials;
    }
    const instanceId = await this.getConfig('greenapi_instance_id', '');
    const apiToken = await this.getConfig('greenapi_token', '');
    this.cachedCredentials = { instanceId, apiToken };
    this.cacheTimestamp = Date.now();
    return { instanceId, apiToken };
  }

  async isConfigured(): Promise<boolean> {
    const { instanceId, apiToken } = await this.getCredentials();
    return !!(instanceId && apiToken);
  }

  async sendMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
    const { instanceId, apiToken } = await this.getCredentials();
    
    if (!instanceId || !apiToken) {
      throw new Error('Green API no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const chatId = `${phoneWithCountry}@c.us`;

    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          message: message
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error al enviar mensaje de WhatsApp (Green API): ${error}`);
      }

      const result = await response.json();
      
      return {
        idMessage: result.idMessage || `MSG_${Date.now()}`,
        provider: this.name
      };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Timeout al enviar mensaje de WhatsApp (Green API) - 8s');
      }
      throw error;
    }
  }

  async sendMessageWithButtons({ phone, message, buttons }: SendMessageWithButtonsParams): Promise<SendMessageResponse> {
    const { instanceId, apiToken } = await this.getCredentials();
    
    if (!instanceId || !apiToken) {
      throw new Error('Green API no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const chatId = `${phoneWithCountry}@c.us`;

    const url = `https://api.green-api.com/waInstance${instanceId}/SendInteractiveButtons/${apiToken}`;

    const payload = {
      chatId: chatId,
      message: message,
      buttons: buttons.map((btn) => ({
        buttonId: btn.buttonId,
        buttonText: btn.buttonText.trim()
      }))
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.log('🔄 Green API botones falló, intentando mensaje normal...');
        return this.sendMessage({ phone, message });
      }

      const result = await response.json();
      
      return {
        idMessage: result.idMessage || `MSG_BTN_${Date.now()}`,
        provider: this.name
      };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.log('🔄 Green API botones timeout, intentando mensaje normal...');
        return this.sendMessage({ phone, message });
      }
      throw error;
    }
  }

  async sendFile({ phone, fileUrl, caption }: SendFileParams): Promise<SendMessageResponse> {
    const { instanceId, apiToken } = await this.getCredentials();
    
    if (!instanceId || !apiToken) {
      throw new Error('Green API no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const chatId = `${phoneWithCountry}@c.us`;

    const url = `https://api.green-api.com/waInstance${instanceId}/sendFileByUrl/${apiToken}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          urlFile: fileUrl,
          fileName: caption || 'archivo',
          caption: caption
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error al enviar archivo: ${error}`);
      }

      const result = await response.json();
      
      return {
        idMessage: result.idMessage || `FILE_${Date.now()}`,
        provider: this.name
      };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Timeout al enviar archivo (Green API) - 8s');
      }
      throw error;
    }
  }
}
