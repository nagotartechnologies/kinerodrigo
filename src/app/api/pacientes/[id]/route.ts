import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getEpisodioActual } from '@/lib/episodios';

// GET - Obtener un paciente por ID
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
    const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND activo = 1').get(id);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    return NextResponse.json(
      { error: 'Error al obtener paciente' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un paciente
export async function PUT(
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
    
    // Mapear nombres de la base de datos (snake_case) a camelCase
    const nombre = body.nombre;
    const rut = body.rut;
    const telefono = body.telefono;
    const edad = body.edad;
    const altura = body.altura;
    const peso = body.peso;
    const ocupacion = body.ocupacion;
    const enfermedades = body.enfermedades;
    const enfermedadesHereditarias = body.enfermedades_hereditarias || body.enfermedadesHereditarias;
    const deportes = body.deportes;
    const alimentacion = body.alimentacion;
    const consumoAgua = body.consumo_agua || body.consumoAgua;
    const descanso = body.descanso;
    const psicologicamente = body.psicologicamente;
    const digestion = body.digestion;
    const lesionConsulta = body.lesion_consulta || body.lesionConsulta;
    const objetivoPaciente = body.objetivo_paciente || body.objetivoPaciente;
    const evaluacionFisica = body.evaluacion_fisica || body.evaluacionFisica;
    const sesiones_programadas = body.sesiones_programadas;
    const evaluacion_final = body.evaluacion_final;
    const estado_tratamiento = body.estado_tratamiento;

    // Verificar si el paciente existe y obtener valores actuales
    const existingPaciente: any = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND activo = 1').get(id);
    if (!existingPaciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Actualizar paciente - usar valores existentes si no se proporcionan nuevos
    await db.prepare(`
      UPDATE pacientes SET
        nombre = ?,
        rut = ?,
        telefono = ?,
        edad = ?,
        altura = ?,
        peso = ?,
        ocupacion = ?,
        enfermedades = ?,
        enfermedades_hereditarias = ?,
        deportes = ?,
        alimentacion = ?,
        consumo_agua = ?,
        descanso = ?,
        psicologicamente = ?,
        digestion = ?,
        lesion_consulta = ?,
        objetivo_paciente = ?,
        evaluacion_fisica = ?,
        sesiones_programadas = ?,
        evaluacion_final = ?,
        estado_tratamiento = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nombre,
      rut,
      telefono,
      edad,
      altura,
      peso,
      ocupacion !== undefined ? (ocupacion || null) : existingPaciente.ocupacion,
      enfermedades !== undefined ? (enfermedades || null) : existingPaciente.enfermedades,
      enfermedadesHereditarias !== undefined ? (enfermedadesHereditarias || null) : existingPaciente.enfermedades_hereditarias,
      deportes !== undefined ? (deportes || null) : existingPaciente.deportes,
      alimentacion !== undefined ? (alimentacion || null) : existingPaciente.alimentacion,
      consumoAgua !== undefined ? (consumoAgua || null) : existingPaciente.consumo_agua,
      descanso !== undefined ? (descanso || null) : existingPaciente.descanso,
      psicologicamente !== undefined ? (psicologicamente || null) : existingPaciente.psicologicamente,
      digestion !== undefined ? (digestion || null) : existingPaciente.digestion,
      lesionConsulta !== undefined ? (lesionConsulta || existingPaciente.lesion_consulta) : existingPaciente.lesion_consulta,
      objetivoPaciente !== undefined ? (objetivoPaciente || existingPaciente.objetivo_paciente) : existingPaciente.objetivo_paciente,
      evaluacionFisica !== undefined ? (evaluacionFisica || null) : existingPaciente.evaluacion_fisica,
      sesiones_programadas !== undefined ? (sesiones_programadas || null) : existingPaciente.sesiones_programadas,
      evaluacion_final !== undefined ? (evaluacion_final || null) : existingPaciente.evaluacion_final,
      estado_tratamiento || existingPaciente.estado_tratamiento || 'en_tratamiento',
      id
    );

    const paciente: any = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);

    // Sincronizar campos clínicos con el episodio actual (fuente de verdad por episodio)
    const episodioActual = await getEpisodioActual(id);
    if (episodioActual) {
      await db.prepare(`
        UPDATE episodios
        SET motivo_lesion = ?, objetivo = ?, evaluacion_fisica = ?, evaluacion_final = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        paciente.lesion_consulta || null,
        paciente.objetivo_paciente || null,
        paciente.evaluacion_fisica || null,
        paciente.evaluacion_final || null,
        episodioActual.id
      );
    }

    return NextResponse.json({
      message: 'Paciente actualizado exitosamente',
      paciente
    });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    return NextResponse.json(
      { error: 'Error al actualizar paciente' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un paciente y todos sus datos relacionados
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    
    // Verificar si el paciente existe
    const existingPaciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND activo = 1').get(id);
    if (!existingPaciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Eliminar todos los datos relacionados con el paciente en orden
    // 1. Obtener IDs de citas del paciente para eliminar recordatorios
    const citas: any = await db.prepare('SELECT id FROM citas WHERE paciente_id = ?').all(id);
    const citaIds = citas.map((c: any) => c.id);

    // 2. Eliminar recordatorios de las citas del paciente
    if (citaIds.length > 0) {
      const placeholders = citaIds.map(() => '?').join(',');
      await db.prepare(`DELETE FROM recordatorios WHERE cita_id IN (${placeholders})`).run(...citaIds);
    }

    // 3. Eliminar pagos del paciente
    await db.prepare('DELETE FROM pagos WHERE paciente_id = ?').run(id);

    // 4. Eliminar sesiones del paciente
    await db.prepare('DELETE FROM sesiones WHERE paciente_id = ?').run(id);

    // 5. Eliminar citas del paciente
    await db.prepare('DELETE FROM citas WHERE paciente_id = ?').run(id);

    // 6. Finalmente, eliminar el paciente (soft delete)
    await db.prepare('UPDATE pacientes SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return NextResponse.json({
      message: 'Paciente y todos sus datos relacionados eliminados exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar paciente' },
      { status: 500 }
    );
  }
}
