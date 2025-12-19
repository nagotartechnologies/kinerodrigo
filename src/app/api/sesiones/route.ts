import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener todas las sesiones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let query = `
      SELECT 
        s.id,
        s.paciente_id,
        s.cita_id,
        s.fecha,
        s.hora,
        s.duracion,
        s.tipo,
        s.estado,
        s.numero_sesion,
        s.notas_sesion,
        s.ejercicios_realizados,
        s.observaciones,
        s.dolor_inicial,
        s.dolor_final,
        s.movilidad,
        s.fuerza,
        s.progreso_general,
        s.recomendaciones,
        s.proxima_sesion,
        s.created_at,
        s.updated_at,
        p.nombre as paciente_nombre,
        p.rut as paciente_rut,
        p.telefono as paciente_telefono,
        p.sesiones_programadas,
        p.evaluacion_final
      FROM sesiones s
      LEFT JOIN pacientes p ON s.paciente_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (pacienteId) {
      query += ' AND s.paciente_id = ?';
      params.push(parseInt(pacienteId));
    }

    if (estado) {
      query += ' AND s.estado = ?';
      params.push(estado);
    }

    if (fechaDesde) {
      query += ' AND s.fecha >= ?';
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ' AND s.fecha <= ?';
      params.push(fechaHasta);
    }

    query += ' ORDER BY s.fecha DESC, s.hora DESC';

    const sesiones = await db.prepare(query).all(...params);

    // Formatear sesiones
    const sesionesFormateadas = sesiones.map((sesion: any) => ({
      id: sesion.id,
      pacienteId: sesion.paciente_id,
      citaId: sesion.cita_id,
      paciente: sesion.paciente_nombre,
      rut: sesion.paciente_rut,
      telefono: sesion.paciente_telefono,
      fecha: sesion.fecha,
      hora: sesion.hora,
      duracion: sesion.duracion,
      tipo: sesion.tipo,
      estado: sesion.estado,
      numeroSesion: sesion.numero_sesion,
      sesionesProgramadas: sesion.sesiones_programadas,
      evaluacionFinal: sesion.evaluacion_final,
      notasSesion: sesion.notas_sesion,
      ejerciciosRealizados: sesion.ejercicios_realizados ? JSON.parse(sesion.ejercicios_realizados) : [],
      observaciones: sesion.observaciones,
      dolorInicial: sesion.dolor_inicial,
      dolorFinal: sesion.dolor_final,
      movilidad: sesion.movilidad,
      fuerza: sesion.fuerza,
      progresoGeneral: sesion.progreso_general,
      recomendaciones: sesion.recomendaciones,
      proximaSesion: sesion.proxima_sesion,
      createdAt: sesion.created_at,
      updatedAt: sesion.updated_at
    }));

    return NextResponse.json({
      success: true,
      sesiones: sesionesFormateadas,
      total: sesionesFormateadas.length
    });
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener sesiones' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva sesión
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pacienteId,
      citaId,
      fecha,
      hora,
      duracion,
      tipo,
      estado,
      notasSesion,
      ejerciciosRealizados,
      observaciones,
      dolorInicial,
      dolorFinal,
      movilidad,
      fuerza,
      progresoGeneral,
      recomendaciones,
      proximaSesion
    } = body;

    // Validaciones
    if (!pacienteId || !fecha || !hora || !tipo) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el paciente existe
    const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    let citaIdFinal = citaId;

    // Si no se proporciona citaId, crear una cita automáticamente
    if (!citaId) {
      const citaResult = await db.prepare(`
        INSERT INTO citas (
          paciente_id, fecha, hora, duracion, tipo, estado, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        pacienteId,
        fecha,
        hora,
        duracion || 60,
        tipo,
        estado || 'programada',
        notasSesion || 'Cita creada automáticamente desde sesión'
      );
      
      citaIdFinal = citaResult.lastInsertRowid;
      console.log(`✅ Cita creada automáticamente: ID ${citaIdFinal}`);
    }

    // Insertar sesión
    const result = await db.prepare(`
      INSERT INTO sesiones (
        paciente_id, cita_id, fecha, hora, duracion, tipo, estado,
        notas_sesion, ejercicios_realizados, observaciones,
        dolor_inicial, dolor_final, movilidad, fuerza,
        progreso_general, recomendaciones, proxima_sesion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pacienteId,
      citaIdFinal,
      fecha,
      hora,
      duracion || 60,
      tipo,
      estado || 'programada',
      notasSesion || null,
      ejerciciosRealizados ? JSON.stringify(ejerciciosRealizados) : null,
      observaciones || null,
      dolorInicial || null,
      dolorFinal || null,
      movilidad || null,
      fuerza || null,
      progresoGeneral || null,
      recomendaciones || null,
      proximaSesion || null
    );

    return NextResponse.json({
      success: true,
      sesion: { 
        id: result.lastInsertRowid,
        citaId: citaIdFinal,
        citaCreada: !citaId
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear sesión' },
      { status: 500 }
    );
  }
}
