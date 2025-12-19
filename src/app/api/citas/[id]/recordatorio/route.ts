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
    const cita: any = db.prepare(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.duracion,
        c.tipo,
        c.estado,
        p.nombre as paciente_nombre,
        p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(citaId);

    if (!cita) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la cita no esté cancelada
    if (cita.estado === 'cancelada') {
      return NextResponse.json(
        { success: false, error: 'No se puede enviar recordatorio de una cita cancelada' },
        { status: 400 }
      );
    }

    // Verificar que el paciente tenga teléfono
    if (!cita.paciente_telefono) {
      return NextResponse.json(
        { success: false, error: 'El paciente no tiene número de teléfono registrado' },
        { status: 400 }
      );
    }

    // Formatear mensaje
    const mensaje = formatearMensajeRecordatorio({
      paciente: cita.paciente_nombre,
      fecha: cita.fecha,
      hora: cita.hora,
      tipo: cita.tipo,
      duracion: cita.duracion
    });

    // Enviar mensaje por WhatsApp
    const resultado = await sendWhatsAppMessage({
      phone: cita.paciente_telefono,
      message: mensaje
    });

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
