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

    // Validar campos requeridos
    if (!nombre || !rut || !telefono || !edad || !altura || !peso || !lesionConsulta || !objetivoPaciente) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el RUT ya existe
    const existingPaciente = await db.prepare('SELECT id FROM pacientes WHERE rut = ?').get(rut);
    if (existingPaciente) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con este RUT' },
        { status: 409 }
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

    const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ 
      message: 'Paciente creado exitosamente',
      paciente 
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 }
    );
  }
}
