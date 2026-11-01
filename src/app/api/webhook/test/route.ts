import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Probar webhook manualmente
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const citaId = searchParams.get('citaId');
    const accion = searchParams.get('accion') || 'confirmar';

    if (!citaId) {
      return NextResponse.json({
        success: false,
        error: 'citaId es requerido'
      }, { status: 400 });
    }

    // Buscar la cita
    const cita: any = await db.prepare(`
      SELECT c.*, p.nombre as paciente_nombre, p.telefono
      FROM citas c
      INNER JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(citaId);

    if (!cita) {
      return NextResponse.json({
        success: false,
        error: 'Cita no encontrada'
      }, { status: 404 });
    }

    // Actualizar estado según la acción
    let nuevoEstado = '';
    if (accion === 'confirmar') {
      nuevoEstado = 'confirmada';
    } else if (accion === 'cancelar') {
      nuevoEstado = 'cancelada';
    }

    if (nuevoEstado) {
      await db.prepare('UPDATE citas SET estado = ? WHERE id = ?').run(nuevoEstado, citaId);
      
      return NextResponse.json({
        success: true,
        message: `Cita ${nuevoEstado} exitosamente`,
        cita: {
          id: cita.id,
          paciente: cita.paciente_nombre,
          fecha: cita.fecha,
          hora: cita.hora,
          estadoAnterior: cita.estado,
          estadoNuevo: nuevoEstado
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error en test webhook:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
