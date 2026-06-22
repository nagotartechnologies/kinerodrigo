import { NextRequest, NextResponse } from 'next/server';
import { getAllProvidersStatus } from '@/lib/whatsapp/factory';
import db from '@/lib/db';

// GET - Obtener estado de todos los proveedores
export async function GET() {
  try {
    const providers = await getAllProvidersStatus();
    
    // Obtener proveedor activo
    const activeConfig: any = await db.prepare(
      'SELECT valor FROM configuraciones WHERE clave = ?'
    ).get('whatsapp_provider');
    
    const activeProvider = activeConfig?.valor || 'auto';
    
    return NextResponse.json({
      success: true,
      providers,
      activeProvider,
      testMode: process.env.WHATSAPP_TEST_MODE === 'true'
    });
  } catch (error: any) {
    console.error('Error al obtener proveedores:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Cambiar proveedor activo
export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Se requiere especificar el proveedor' },
        { status: 400 }
      );
    }
    
    const validProviders = ['auto', 'greenapi', 'twilio', 'meta', 'wassenger', 'ultramsg'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no válido' },
        { status: 400 }
      );
    }
    
    // Actualizar o insertar configuración
    await db.prepare(`
      INSERT INTO configuraciones (clave, valor, descripcion, categoria)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `).run(
      'whatsapp_provider',
      provider,
      'Proveedor de WhatsApp activo (auto, greenapi, twilio, meta)',
      'whatsapp'
    );
    
    return NextResponse.json({
      success: true,
      message: `Proveedor cambiado a: ${provider}`,
      provider
    });
  } catch (error: any) {
    console.error('Error al cambiar proveedor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar credenciales de un proveedor
export async function PUT(request: NextRequest) {
  try {
    const { provider, credentials } = await request.json();
    
    if (!provider || !credentials) {
      return NextResponse.json(
        { success: false, error: 'Se requiere proveedor y credenciales' },
        { status: 400 }
      );
    }
    
    // Mapeo de credenciales por proveedor
    const credentialMaps: Record<string, Record<string, string>> = {
      greenapi: {
        instanceId: 'greenapi_instance_id',
        apiToken: 'greenapi_token'
      },
      twilio: {
        accountSid: 'twilio_account_sid',
        authToken: 'twilio_auth_token',
        whatsappNumber: 'twilio_whatsapp_number'
      },
      meta: {
        phoneNumberId: 'meta_phone_number_id',
        accessToken: 'meta_access_token'
      },
      wassenger: {
        apiKey: 'wassenger_api_key',
        deviceId: 'wassenger_device_id'
      },
      ultramsg: {
        instanceId: 'ultramsg_instance_id',
        token: 'ultramsg_token'
      }
    };
    
    const credentialMap = credentialMaps[provider];
    if (!credentialMap) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no válido' },
        { status: 400 }
      );
    }
    
    // Actualizar cada credencial
    for (const [key, dbKey] of Object.entries(credentialMap)) {
      if (credentials[key] !== undefined) {
        await db.prepare(`
          INSERT INTO configuraciones (clave, valor, descripcion, categoria)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
        `).run(
          dbKey,
          credentials[key],
          `Credencial ${key} para ${provider}`,
          'whatsapp'
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Credenciales de ${provider} actualizadas exitosamente`
    });
  } catch (error: any) {
    console.error('Error al actualizar credenciales:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
