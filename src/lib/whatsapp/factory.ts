// Factory para crear y gestionar proveedores de WhatsApp
import db from '@/lib/db';
import { WhatsAppProvider } from './providers/base';
import { GreenAPIProvider } from './providers/greenapi';
import { TwilioProvider } from './providers/twilio';
import { MetaCloudAPIProvider } from './providers/meta';
import { WassengerProvider } from './providers/wassenger';
import { UltramsgProvider } from './providers/ultramsg';

// Tipos de proveedores disponibles
export type ProviderType = 'greenapi' | 'twilio' | 'meta' | 'wassenger' | 'ultramsg' | 'auto';

// Registro de proveedores
const providers: Record<string, WhatsAppProvider> = {
  greenapi: new GreenAPIProvider(),
  twilio: new TwilioProvider(),
  meta: new MetaCloudAPIProvider(),
  wassenger: new WassengerProvider(),
  ultramsg: new UltramsgProvider(),
};

/**
 * Obtener el proveedor activo desde la configuración
 */
async function getActiveProviderType(): Promise<ProviderType> {
  try {
    const config: any = await db.prepare(
      'SELECT valor FROM configuraciones WHERE clave = ?'
    ).get('whatsapp_provider');
    
    return (config?.valor as ProviderType) || 'auto';
  } catch (error) {
    return 'auto';
  }
}

/**
 * Obtener el primer proveedor configurado
 */
async function getFirstConfiguredProvider(): Promise<WhatsAppProvider | null> {
  const providerList = Object.values(providers);
  
  for (const provider of providerList) {
    if (await provider.isConfigured()) {
      console.log(`✅ Usando proveedor: ${provider.name}`);
      return provider;
    }
  }
  
  return null;
}

/**
 * Obtener el proveedor de WhatsApp según configuración
 */
export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  const TEST_MODE = process.env.WHATSAPP_TEST_MODE === 'true';
  
  if (TEST_MODE) {
    console.log('🧪 MODO DE PRUEBA - Usando proveedor simulado');
    return new TestProvider();
  }

  const activeType = await getActiveProviderType();
  
  // Modo automático: usar el primer proveedor configurado
  if (activeType === 'auto') {
    const provider = await getFirstConfiguredProvider();
    if (!provider) {
      throw new Error('No hay ningún proveedor de WhatsApp configurado');
    }
    return provider;
  }
  
  // Proveedor específico
  const provider = providers[activeType];
  if (!provider) {
    throw new Error(`Proveedor desconocido: ${activeType}`);
  }
  
  if (!(await provider.isConfigured())) {
    throw new Error(`El proveedor ${provider.name} no está configurado`);
  }
  
  console.log(`✅ Usando proveedor: ${provider.name}`);
  return provider;
}

/**
 * Obtener todos los proveedores disponibles con su estado
 */
export async function getAllProvidersStatus() {
  const statuses = await Promise.all(
    Object.entries(providers).map(async ([key, provider]) => ({
      key,
      name: provider.name,
      configured: await provider.isConfigured()
    }))
  );
  
  return statuses;
}

/**
 * Proveedor de prueba (para desarrollo)
 */
class TestProvider implements WhatsAppProvider {
  name = 'Test Provider';
  
  async isConfigured(): Promise<boolean> {
    return true;
  }
  
  async sendMessage({ phone, message }: any): Promise<any> {
    console.log('🧪 MODO DE PRUEBA - Mensaje simulado');
    console.log('📱 Teléfono:', phone);
    console.log('💬 Mensaje:', message);
    
    return {
      idMessage: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: this.name
    };
  }
  
  async sendMessageWithButtons({ phone, message, buttons }: any): Promise<any> {
    console.log('🧪 MODO DE PRUEBA - Mensaje con botones simulado');
    console.log('📱 Teléfono:', phone);
    console.log('💬 Mensaje:', message);
    console.log('🔘 Botones:', buttons);
    
    return {
      idMessage: `TEST_BTN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: this.name
    };
  }
  
  async sendFile({ phone, fileUrl, caption }: any): Promise<any> {
    console.log('🧪 MODO DE PRUEBA - Archivo simulado');
    console.log('📱 Teléfono:', phone);
    console.log('📎 Archivo:', fileUrl);
    console.log('📝 Caption:', caption);
    
    return {
      idMessage: `TEST_FILE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: this.name
    };
  }
}
