// Proveedor Ultramsg
import db from '@/lib/db';
import { 
  WhatsAppProvider, 
  SendMessageParams, 
  SendMessageWithButtonsParams,
  SendFileParams,
  SendMessageResponse,
  cleanPhoneNumber 
} from './base';

export class UltramsgProvider implements WhatsAppProvider {
  name = 'Ultramsg';

  private async getConfig(clave: string, defaultValue: string = ''): Promise<string> {
    try {
      const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get(clave);
      return config?.valor || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  private async getCredentials() {
    const instanceId = await this.getConfig('ultramsg_instance_id', '');
    const token = await this.getConfig('ultramsg_token', '');
    return { instanceId, token };
  }

  async isConfigured(): Promise<boolean> {
    const { instanceId, token } = await this.getCredentials();
    return !!(instanceId && token);
  }

  async sendMessage({ phone, message }: SendMessageParams): Promise<SendMessageResponse> {
    const { instanceId, token } = await this.getCredentials();
    
    console.log('📤 [Ultramsg] Enviando mensaje simple...');
    console.log('📞 Teléfono:', phone);
    console.log('🔑 Instance ID:', instanceId ? `${instanceId.substring(0, 8)}...` : 'NO CONFIGURADO');
    
    if (!instanceId || !token) {
      throw new Error('Ultramsg no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    console.log('📞 Teléfono limpio:', phoneWithCountry);
    
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    console.log('🔗 URL:', url);

    const formData = new URLSearchParams();
    formData.append('token', token);
    formData.append('to', phoneWithCountry);
    formData.append('body', message);

    console.log('📦 Datos a enviar:', {
      to: phoneWithCountry,
      bodyLength: message.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('📡 Status de respuesta:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📦 Respuesta completa de Ultramsg:', responseText);

    if (!response.ok) {
      console.log('❌ Error al enviar mensaje');
      throw new Error(`Error al enviar mensaje de WhatsApp (Ultramsg): ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('📋 Respuesta parseada:', JSON.stringify(result, null, 2));
    
    // Verificar si Ultramsg realmente envió el mensaje
    if (result.sent === false || result.error) {
      console.log('❌ Ultramsg rechazó el mensaje:', result.error || result.message);
      throw new Error(`Ultramsg rechazó el mensaje: ${result.error || result.message}`);
    }
    
    console.log('✅ Mensaje enviado exitosamente');
    console.log('📋 ID del mensaje:', result.id);
    
    return {
      idMessage: result.id || `ULTRAMSG_${Date.now()}`,
      provider: this.name
    };
  }

  async sendMessageWithButtons({ phone, message, buttons }: SendMessageWithButtonsParams): Promise<SendMessageResponse> {
    const { instanceId, token } = await this.getCredentials();
    
    if (!instanceId || !token) {
      throw new Error('Ultramsg no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    
    try {
      // Intentar primero con botones simples (más compatible que listas)
      console.log('📤 Intentando enviar mensaje con botones simples...');
      const buttonUrl = `https://api.ultramsg.com/${instanceId}/messages/button`;
      const btn1 = buttons[0] ? buttons[0].buttonText : '';
      const btn2 = buttons[1] ? buttons[1].buttonText : '';
      const btn3 = buttons[2] ? buttons[2].buttonText : '';

      const buttonData = new URLSearchParams();
      buttonData.append('token', token);
      buttonData.append('to', phoneWithCountry);
      buttonData.append('body', message);
      
      if (btn1) buttonData.append('btn1', btn1);
      if (btn2) buttonData.append('btn2', btn2);
      if (btn3) buttonData.append('btn3', btn3);

      const response = await fetch(buttonUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: buttonData.toString(),
      });

      console.log('📡 Status de respuesta:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('📦 Respuesta completa de Ultramsg:', responseText);

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log('📋 Respuesta parseada:', JSON.stringify(result, null, 2));
          
          // Verificar si Ultramsg realmente envió el mensaje
          if (result.sent === false || result.error) {
            console.log('❌ Ultramsg rechazó el mensaje:', result.error || result.message);
            console.log('📤 Enviando mensaje normal sin botones como fallback...');
          } else {
            console.log('✅ Mensaje con botones enviado exitosamente');
            console.log('📋 ID del mensaje:', result.id);
            return {
              idMessage: result.id || `ULTRAMSG_BTN_${Date.now()}`,
              provider: this.name
            };
          }
        } catch (e) {
          console.log('⚠️ Error al parsear respuesta JSON:', e);
          console.log('📤 Enviando mensaje normal sin botones como fallback...');
        }
      } else {
        console.log('⚠️ Ultramsg botones falló con status:', response.status);
        console.log('⚠️ Error:', responseText);
        console.log('📤 Enviando mensaje normal sin botones como fallback...');
      }
      
    } catch (error: any) {
      console.log('❌ Error al intentar enviar con botones:', error.message);
      console.log('📤 Enviando mensaje normal sin botones como fallback...');
    }
    
    // Fallback: enviar mensaje normal sin botones
    return this.sendMessage({ phone, message });
  }

  async sendFile({ phone, fileUrl, caption }: SendFileParams): Promise<SendMessageResponse> {
    const { instanceId, token } = await this.getCredentials();
    
    if (!instanceId || !token) {
      throw new Error('Ultramsg no está configurado');
    }

    const phoneWithCountry = cleanPhoneNumber(phone);
    const url = `https://api.ultramsg.com/${instanceId}/messages/document`;

    const formData = new URLSearchParams();
    formData.append('token', token);
    formData.append('to', phoneWithCountry);
    formData.append('filename', fileUrl);
    formData.append('caption', caption || '');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error al enviar archivo (Ultramsg): ${error}`);
    }

    const result = await response.json();
    
    return {
      idMessage: result.id || `ULTRAMSG_FILE_${Date.now()}`,
      provider: this.name
    };
  }
}
