import { NextRequest, NextResponse } from 'next/server';
import { iniciarCronRecordatorios, estadoCronRecordatorios } from '@/lib/cron';

// Esta ruta se llama automáticamente al cargar el dashboard para iniciar el cron
export async function POST(request: NextRequest) {
  try {
    const estado = estadoCronRecordatorios();
    
    // Solo iniciar si no está activo
    if (!estado.activo) {
      iniciarCronRecordatorios();
      console.log('✅ [API] Cron de recordatorios iniciado automáticamente');
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Cron verificado',
      estado: estadoCronRecordatorios()
    });
  } catch (error: any) {
    console.error('Error al iniciar cron:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
