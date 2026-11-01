import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { verifyAuth } from '@/lib/auth';
import { 
  iniciarCronRecordatorios, 
  detenerCronRecordatorios, 
  estadoCronRecordatorios,
  ejecutarRecordatoriosManual 
} from '@/lib/cron';

function secretoValido(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
    const body = await request.json();
    const { accion } = body; // 'iniciar', 'detener', 'ejecutar'

    // La Netlify Scheduled Function se autentica con CRON_SECRET (solo puede ejecutar)
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = request.headers.get('x-cron-secret');
    if (cronSecret && headerSecret && accion === 'ejecutar') {
      if (!secretoValido(headerSecret, cronSecret)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const resultado = await ejecutarRecordatoriosManual();
      return NextResponse.json({ success: true, ...resultado });
    }

    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

      case 'ejecutar': {
        const resultado = await ejecutarRecordatoriosManual();
        mensaje = `Recordatorios ejecutados manualmente: ${resultado.enviados} enviado(s), ${resultado.errores} error(es)`;
        break;
      }

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
