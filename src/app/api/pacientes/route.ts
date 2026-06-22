import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener todos los pacientes
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const pacientes = await db.prepare(`
      SELECT * FROM pacientes 
      WHERE activo = 1 
      ORDER BY created_at DESC
    `).all();

    console.log('📊 Pacientes obtenidos:', pacientes?.length || 0);

    return NextResponse.json({ 
      success: true,
      pacientes 
    });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo paciente
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nombre,
      rut,
      telefono,
      edad,
      altura,
      peso,
      ocupacion,
      enfermedades,
      enfermedadesHereditarias,
      deportes,
      alimentacion,
      consumoAgua,
      descanso,
      psicologicamente,
      digestion,
      lesionConsulta,
      objetivoPaciente,
      evaluacionFisica,
    } = body;

    // Validar campos requeridos (solo nombre)
    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
    }

    // Insertar paciente
    const result = await db.prepare(`
      INSERT INTO pacientes (
        nombre, rut, telefono, edad, altura, peso, ocupacion,
        enfermedades, enfermedades_hereditarias, deportes, alimentacion,
        consumo_agua, descanso, psicologicamente, digestion,
        lesion_consulta, objetivo_paciente, evaluacion_fisica
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      lesionConsulta,
      objetivoPaciente,
      evaluacionFisica || null
    );

    const pacienteId = Number(result.lastInsertRowid);

    // Crear automáticamente el Episodio 1 con los datos clínicos iniciales
    await db.prepare(`
      INSERT INTO episodios
        (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica,
         estado, fecha_inicio)
      VALUES (?, 1, ?, ?, ?, 'en_tratamiento', ?)
    `).run(
      pacienteId,
      lesionConsulta || null,
      objetivoPaciente || null,
      evaluacionFisica || null,
      new Date().toISOString()
    );

    const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId);

    return NextResponse.json({ 
      message: 'Paciente creado exitosamente',
      paciente 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear paciente:', error);
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 }
    );
  }
}
