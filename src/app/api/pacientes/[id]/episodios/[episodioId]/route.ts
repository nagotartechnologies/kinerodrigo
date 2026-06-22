import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getEpisodioActual } from '@/lib/episodios';

// PUT - Actualizar un episodio (datos clínicos, evaluación final)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; episodioId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, episodioId } = await params;
    const body = await request.json();
    const { motivoLesion, objetivo, evaluacionFisica, evaluacionFinal } = body;

    const episodio: any = await db.prepare(
      'SELECT * FROM episodios WHERE id = ? AND paciente_id = ?'
    ).get(episodioId, id);

    if (!episodio) {
      return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 });
    }

    await db.prepare(`
      UPDATE episodios
      SET motivo_lesion = ?, objetivo = ?, evaluacion_fisica = ?, evaluacion_final = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      motivoLesion !== undefined ? motivoLesion : episodio.motivo_lesion,
      objetivo !== undefined ? objetivo : episodio.objetivo,
      evaluacionFisica !== undefined ? evaluacionFisica : episodio.evaluacion_fisica,
      evaluacionFinal !== undefined ? evaluacionFinal : episodio.evaluacion_final,
      episodioId
    );

    // Si es el episodio actual, sincronizar campos clínicos del paciente (compatibilidad UI)
    const episodioActual = await getEpisodioActual(id);
    if (episodioActual && Number(episodioActual.id) === Number(episodioId)) {
      await db.prepare(`
        UPDATE pacientes
        SET lesion_consulta = ?, objetivo_paciente = ?, evaluacion_fisica = ?, evaluacion_final = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        motivoLesion !== undefined ? motivoLesion : episodio.motivo_lesion,
        objetivo !== undefined ? objetivo : episodio.objetivo,
        evaluacionFisica !== undefined ? evaluacionFisica : episodio.evaluacion_fisica,
        evaluacionFinal !== undefined ? evaluacionFinal : episodio.evaluacion_final,
        id
      );
    }

    const episodioActualizado: any = await db.prepare('SELECT * FROM episodios WHERE id = ?').get(episodioId);

    return NextResponse.json({
      success: true,
      message: 'Episodio actualizado exitosamente',
      episodio: episodioActualizado
    });

  } catch (error: any) {
    console.error('Error al actualizar episodio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar episodio' },
      { status: 500 }
    );
  }
}
