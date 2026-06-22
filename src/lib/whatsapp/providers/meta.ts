// Proveedor Meta Cloud API (WhatsApp Business API oficial)
import db from '@/lib/db';
import { 
  WhatsAppProvider, 
  SendMessageParams, 
  SendMessageResponse,
  cleanPhoneNumber 
} from './base';

export class MetaCloudAPIProvider implements WhatsAppProvider {
  name = 'Meta Cloud API';

  private async getConfig(clave: string, defaultValue: string = ''): Promise<string> {
    try {
      const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
      return config?.valor || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  private async getCredentials() {
    const phoneNumberId = await this.getConfig('meta_phone_number_id', '');
    const accessToken = await this.getConfig('meta_access_token', '');
    return { phoneNumberId, accessToken };
  }

  async isConfigured(): Promise<boolean> {
    const { phoneNumberId, accessToken } = await this.getCredentials();
    return !!(phoneNumberId && accessToken);
  }

  async sendMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
    const { phoneNumberId, accessToken } = await this.getCredentials();
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta Cloud API no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneWithCountry,
        type: 'text',
        text: {
          body: message
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar mensaje de WhatsApp (Meta Cloud API): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.messages?.[0]?.id || `META_${Date.now()}`,
      provider: this.name
    };
  }

  // Enviar mensaje usando plantilla aprobada
  async sendTemplate({ 
    phone, 
    templateName, 
    languageCode = 'es',
    components = [] 
  }: {
    phone: string;
    templateName: string;
    languageCode?: string;
    components?: any[];
  }): Promise<SendMessageResponse> {
    const { phoneNumberId, accessToken } = await this.getCredentials();
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta Cloud API no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneWithCountry,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar plantilla de WhatsApp (Meta Cloud API): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.messages?.[0]?.id || `META_TPL_${Date.now()}`,
      provider: this.name
    };
  }
}
