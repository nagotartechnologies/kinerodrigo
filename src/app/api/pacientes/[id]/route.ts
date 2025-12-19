import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

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

    // Verificar si el paciente existe
    const existingPaciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND activo = 1').get(id);
    if (!existingPaciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Verificar si el RUT ya existe en otro paciente
    const rutConflict = await db.prepare('SELECT id FROM pacientes WHERE rut = ? AND id != ?').get(rut, id);
    if (rutConflict) {
      return NextResponse.json(
        { error: 'Ya existe otro paciente con este RUT' },
        { status: 409 }
      );
    }

    // Actualizar paciente
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nombre,
      rut,
      telefono,
      edad,
      altura,
      peso,
      ocupacion || null,
      enfermedades || null,
      enfermedadesHereditarias || null,
      deportes || null,
      alimentacion || null,
      consumoAgua || null,
      descanso || null,
      psicologicamente || null,
      digestion || null,
      lesionConsulta || null,
      objetivoPaciente || null,
      evaluacionFisica || null,
      sesiones_programadas || null,
      evaluacion_final || null,
      id
    );

    const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);

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

// DELETE - Eliminar (desactivar) un paciente
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

    // Soft delete - marcar como inactivo
    await db.prepare('UPDATE pacientes SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return NextResponse.json({
      message: 'Paciente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar paciente' },
      { status: 500 }
    );
  }
}
