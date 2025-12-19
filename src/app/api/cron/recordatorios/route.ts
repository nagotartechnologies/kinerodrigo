import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  iniciarCronRecordatorios, 
  detenerCronRecordatorios, 
  estadoCronRecordatorios,
  ejecutarRecordatoriosManual 
} from '@/lib/cron';

// GET - Obtener estado del cron de recordatorios
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const estado = estadoCronRecordatorios();

    return NextResponse.json({
      success: true,
      estado
    });
  } catch (error: any) {
    console.error('Error al obtener estado del cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener estado' },
      { status: 500 }
    );
  }
}

// POST - Controlar el cron de recordatorios
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { accion } = body; // 'iniciar', 'detener', 'ejecutar'

    if (!accion) {
      return NextResponse.json(
        { success: false, error: 'Acción requerida' },
        { status: 400 }
      );
    }

    let mensaje = '';

    switch (accion) {
      case 'iniciar':
        iniciarCronRecordatorios();
        mensaje = 'Cron de recordatorios iniciado';
        break;

      case 'detener':
        detenerCronRecordatorios();
        mensaje = 'Cron de recordatorios detenido';
        break;

      case 'ejecutar':
        await ejecutarRecordatoriosManual();
        mensaje = 'Recordatorios ejecutados manualmente';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }

    const estado = estadoCronRecordatorios();

    return NextResponse.json({
      success: true,
      mensaje,
      estado
    });

  } catch (error: any) {
    console.error('Error al controlar cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al controlar cron' },
      { status: 500 }
    );
  }
}
