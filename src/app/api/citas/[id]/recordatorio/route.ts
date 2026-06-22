import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendWhatsAppMessage, formatearMensajeRecordatorio } from '@/lib/whatsapp';

// POST - Enviar recordatorio de cita por WhatsApp
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const citaId = parseInt(idStr);

    // Obtener información de la cita
    const cita: any = await db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.duracion,
        c.tipo,
        c.estado,
        c.paciente_id,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(citaId);

    console.log('📋 Datos de la cita:', {
      citaId,
      pacienteId: cita?.paciente_id,
      pacienteNombre: cita?.paciente_nombre,
      pacienteTelefono: cita?.paciente_telefono,
      telefonoTipo: typeof cita?.paciente_telefono,
      telefonoLength: cita?.paciente_telefono?.length
    });

    if (!cita) {
      console.log('❌ Cita no encontrada');
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Cita encontrada, estado:', cita.estado);

    // Verificar que la cita no esté cancelada
    if (cita.estado === 'cancelada') {
      console.log('❌ Cita cancelada, no se puede enviar recordatorio');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se puede enviar recordatorio a una cita cancelada',
          tipo: 'cita_cancelada'
        },
        { status: 400 }
      );
    }

    // Verificar que la cita no esté completada o confirmada
    if (cita.estado === 'completada' || cita.estado === 'confirmada') {
      console.log('❌ Cita completada/confirmada, no se puede enviar recordatorio');
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede enviar recordatorio a una cita ${cita.estado}`,
          tipo: 'cita_completada_confirmada'
        },
        { status: 400 }
      );
    }

    console.log('✅ Estado de cita válido');

    // Verificar que la cita no haya pasado (fecha y hora)
    // Usar zona horaria de Chile (America/Santiago, UTC-3)
    const ahora = new Date();
    const ahoraChile = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const year = ahoraChile.getFullYear();
    const month = String(ahoraChile.getMonth() + 1).padStart(2, '0');
    const day = String(ahoraChile.getDate()).padStart(2, '0');
    const fechaActual = `${year}-${month}-${day}`;
    const horaActual = `${String(ahoraChile.getHours()).padStart(2, '0')}:${String(ahoraChile.getMinutes()).padStart(2, '0')}`;
    
    console.log('📅 Validación de fecha:', {
      fechaCita: cita.fecha,
      horaCita: cita.hora,
      fechaActual,
      horaActual
    });
    
    const citaPasada = cita.fecha < fechaActual || 
                       (cita.fecha === fechaActual && cita.hora <= horaActual);
    
    if (citaPasada) {
      console.log('❌ Cita ya pasó, no se puede enviar recordatorio');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se puede enviar recordatorio a una cita que ya pasó de horario',
          tipo: 'cita_pasada'
        },
        { status: 400 }
      );
    }

    console.log('✅ Fecha válida, cita es futura');

    // Verificar que el paciente tenga teléfono
    if (!cita.paciente_telefono || cita.paciente_telefono.trim() === '') {
      console.log('❌ Teléfono no válido:', {
        telefono: cita.paciente_telefono,
        esNull: cita.paciente_telefono === null,
        esUndefined: cita.paciente_telefono === undefined,
        esVacio: cita.paciente_telefono === ''
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: `El paciente ${cita.paciente_nombre} no tiene número de teléfono registrado. Por favor, edita el paciente y agrega su número de WhatsApp.`,
          paciente: cita.paciente_nombre,
          debug: {
            telefono: cita.paciente_telefono,
            tipo: typeof cita.paciente_telefono
          }
        },
        { status: 400 }
      );
    }

    console.log('✅ Teléfono válido, continuando con envío...');

    // Formatear mensaje usando la misma función que el envío masivo
    const mensaje = await formatearMensajeRecordatorio({
      paciente: cita.paciente_nombre,
      fecha: cita.fecha,
      hora: cita.hora,
      tipo: cita.tipo,
      duracion: cita.duracion
    });
    
    console.log('📤 Preparando envío de mensaje...');
    console.log('📞 Teléfono:', cita.paciente_telefono);
    console.log('💬 Longitud del mensaje:', mensaje.length);
    
    // Enviar mensaje por WhatsApp (texto plano, sin botones interactivos)
    let resultado;
    try {
      resultado = await sendWhatsAppMessage({
        phone: cita.paciente_telefono,
        message: mensaje
      });
      console.log('✅ Mensaje enviado, ID:', resultado.idMessage);
    } catch (sendError: any) {
      console.error('❌ Error al enviar mensaje:', sendError);
      throw sendError;
    }

    // Registrar el envío en la base de datos
    db.prepare(`
      INSERT INTO recordatorios (
        cita_id,
        mensaje_id,
        telefono,
        mensaje,
        estado,
        enviado_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      citaId,
      resultado.idMessage,
      cita.paciente_telefono,
      mensaje,
      'enviado'
    );

    return NextResponse.json({
      success: true,
      message: 'Recordatorio enviado exitosamente',
      whatsappMessageId: resultado.idMessage
    });

  } catch (error: any) {
    console.error('Error al enviar recordatorio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al enviar recordatorio' 
      },
      { status: 500 }
    );
  }
}
