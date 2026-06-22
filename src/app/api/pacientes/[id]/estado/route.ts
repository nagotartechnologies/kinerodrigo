import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getEpisodioActual, asegurarEpisodio, mapearEstadoPacienteAEpisodio } from '@/lib/episodios';

// POST - Cambiar estado del paciente (activo, alta, abandono)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { estado, motivo, notas } = body;

    // Validar estado
    const estadosValidos = ['activo', 'alta', 'abandono'];
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json({ 
        error: 'Estado inválido. Debe ser: activo, alta o abandono' 
      }, { status: 400 });
    }

    // Obtener paciente actual
    const paciente: any = await db.prepare(
      'SELECT id, nombre, estado_paciente FROM pacientes WHERE id = ? AND activo = 1'
    ).get(id);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const estadoAnterior = paciente.estado_paciente || 'activo';

    // No hacer nada si el estado es el mismo
    if (estadoAnterior === estado) {
      return NextResponse.json({ 
        success: true, 
        message: 'El paciente ya tiene ese estado',
        paciente: { ...paciente, estado_paciente: estado }
      });
    }

    // Actualizar estado del paciente
    await db.prepare(
      'UPDATE pacientes SET estado_paciente = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(estado, id);

    // Aplicar el cambio de estado al episodio actual
    await asegurarEpisodio(id);
    const episodioActual = await getEpisodioActual(id);
    if (episodioActual) {
      const estadoEpisodio = mapearEstadoPacienteAEpisodio(estado);
      // alta => cerrar episodio; activo/receso => mantener abierto
      const fechaCierre = estado === 'alta' ? new Date().toISOString() : null;
      await db.prepare(`
        UPDATE episodios
        SET estado = ?, fecha_cierre = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(estadoEpisodio, fechaCierre, episodioActual.id);
    }

    // Registrar cambio en historial
    await db.prepare(`
      INSERT INTO historial_estados_paciente (paciente_id, estado_anterior, estado_nuevo, motivo, notas)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, estadoAnterior, estado, motivo || null, notas || null);

    // Obtener paciente actualizado
    const pacienteActualizado: any = await db.prepare(
      'SELECT * FROM pacientes WHERE id = ?'
    ).get(id);

    return NextResponse.json({
      success: true,
      message: `Estado del paciente cambiado de "${estadoAnterior}" a "${estado}"`,
      paciente: pacienteActualizado
    });

  } catch (error: any) {
    console.error('Error al cambiar estado del paciente:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cambiar estado del paciente' },
      { status: 500 }
    );
  }
}

// GET - Obtener historial de cambios de estado de un paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el paciente existe
    const paciente: any = await db.prepare(
      'SELECT id, nombre, estado_paciente FROM pacientes WHERE id = ? AND activo = 1'
    ).get(id);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Obtener historial de cambios de estado
    const historial: any[] = await db.prepare(`
      SELECT id, estado_anterior, estado_nuevo, motivo, notas, created_at
      FROM historial_estados_paciente
      WHERE paciente_id = ?
      ORDER BY created_at DESC
    `).all(id);

    return NextResponse.json({
      success: true,
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        estadoActual: paciente.estado_paciente || 'activo'
      },
      historial: historial.map((h: any) => ({
        id: h.id,
        estadoAnterior: h.estado_anterior,
        estadoNuevo: h.estado_nuevo,
        motivo: h.motivo,
        notas: h.notas,
        fecha: h.created_at
      }))
    });

  } catch (error: any) {
    console.error('Error al obtener historial de estados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial de estados' },
      { status: 500 }
    );
  }
}
