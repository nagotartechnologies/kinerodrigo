import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getEpisodioActual, asegurarEpisodio, mapearEstadoEpisodioAPaciente } from '@/lib/episodios';

// GET - Listar todos los episodios de un paciente (con conteo de sesiones)
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

    const paciente: any = await db.prepare(
      'SELECT id FROM pacientes WHERE id = ? AND activo = 1'
    ).get(id);
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Asegurar que existe al menos un episodio (migración perezosa)
    await asegurarEpisodio(id);

    const episodios: any[] = await db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id) as total_sesiones,
        (SELECT COUNT(*) FROM sesiones s WHERE s.episodio_id = e.id AND s.estado = 'completada') as sesiones_completadas
      FROM episodios e
      WHERE e.paciente_id = ?
      ORDER BY e.numero_episodio DESC
    `).all(id);

    const episodioActual = await getEpisodioActual(id);

    return NextResponse.json({
      success: true,
      episodios,
      episodioActualId: episodioActual?.id || null
    });

  } catch (error: any) {
    console.error('Error al obtener episodios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener episodios del paciente' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo episodio (cierra el episodio actual y abre uno nuevo)
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
    const { motivoLesion, objetivo, evaluacionFisica } = body;

    const paciente: any = await db.prepare(
      'SELECT * FROM pacientes WHERE id = ? AND activo = 1'
    ).get(id);
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Asegurar episodios previos migrados antes de crear uno nuevo
    await asegurarEpisodio(id);

    const episodioActual = await getEpisodioActual(id);

    // Cerrar el episodio actual si sigue abierto
    if (episodioActual && episodioActual.estado !== 'alta') {
      await db.prepare(
        `UPDATE episodios
         SET estado = 'alta',
             fecha_cierre = COALESCE(fecha_cierre, ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(new Date().toISOString(), episodioActual.id);
    }

    const siguienteNumero = (episodioActual?.numero_episodio || 0) + 1;

    // Crear el nuevo episodio
    const result: any = await db.prepare(`
      INSERT INTO episodios
        (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica,
         estado, fecha_inicio)
      VALUES (?, ?, ?, ?, ?, 'en_tratamiento', ?)
    `).run(
      id,
      siguienteNumero,
      motivoLesion || null,
      objetivo || null,
      evaluacionFisica || null,
      new Date().toISOString()
    );

    const nuevoEpisodioId = Number(result.lastInsertRowid);

    // Sincronizar campos clínicos y estado del paciente con el nuevo episodio (compatibilidad UI)
    await db.prepare(`
      UPDATE pacientes
      SET lesion_consulta = ?, objetivo_paciente = ?, evaluacion_fisica = ?,
          evaluacion_final = NULL, estado_paciente = 'activo', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(motivoLesion || null, objetivo || null, evaluacionFisica || null, id);

    // Registrar en historial de estados
    await db.prepare(`
      INSERT INTO historial_estados_paciente (paciente_id, estado_anterior, estado_nuevo, motivo, notas)
      VALUES (?, ?, 'activo', ?, ?)
    `).run(id, mapearEstadoEpisodioAPaciente(episodioActual?.estado), 'Nuevo episodio', motivoLesion || null);

    const nuevoEpisodio: any = await db.prepare('SELECT * FROM episodios WHERE id = ?').get(nuevoEpisodioId);

    return NextResponse.json({
      success: true,
      message: `Episodio ${siguienteNumero} creado exitosamente`,
      episodio: nuevoEpisodio
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear episodio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear episodio' },
      { status: 500 }
    );
  }
}
