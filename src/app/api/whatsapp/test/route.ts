import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { telefono } = await request.json();

    if (!telefono) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere un numero de telefono' 
      }, { status: 400 });
    }

    const provider = await getWhatsAppProvider();
    
    const result = await provider.sendMessage({
      phone: telefono,
      message: 'Mensaje de prueba desde KINE-CITAS. Si recibes este mensaje, la conexion de WhatsApp esta funcionando correctamente.'
    });

    return NextResponse.json({ 
      success: true, 
      provider: provider.name,
      messageId: result.idMessage
    });
  } catch (error: any) {
    console.error('Error en test de WhatsApp:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al enviar mensaje de prueba'
    }, { status: 500 });
  }
}
