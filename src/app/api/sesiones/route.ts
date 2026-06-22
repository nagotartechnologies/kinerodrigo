import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { asegurarEpisodio } from '@/lib/episodios';

// GET - Obtener todas las sesiones
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let query = `
      SELECT 
        s.id,
        s.paciente_id,
        s.episodio_id,
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
        s.borg_percepcion,
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
      episodioId: sesion.episodio_id,
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
      borgPercepcion: sesion.borg_percepcion,
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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
      borgPercepcion,
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

    // Verificar que el paciente existe y su estado
    const paciente: any = await db.prepare('SELECT id, nombre, estado_paciente FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el paciente no esté de alta o abandono
    if (paciente.estado_paciente === 'alta') {
      return NextResponse.json(
        { success: false, error: 'No se pueden crear sesiones para pacientes dados de alta. Por favor, reactive al paciente primero.' },
        { status: 400 }
      );
    }
    
    if (paciente.estado_paciente === 'abandono') {
      return NextResponse.json(
        { success: false, error: 'No se pueden crear sesiones para pacientes en receso. Por favor, reactive al paciente primero.' },
        { status: 400 }
      );
    }

    // Obtener (o crear) el episodio actual del paciente
    const episodio = await asegurarEpisodio(pacienteId);
    const episodioId = episodio?.id || null;

    // Calcular numero_sesion automáticamente DENTRO del episodio actual
    const countResult: any = await db.prepare(
      'SELECT COUNT(*) as total FROM sesiones WHERE episodio_id = ?'
    ).get(episodioId);
    const numeroSesion = (countResult?.total || 0) + 1;

    let citaIdFinal = citaId || null;

    // Si no hay citaId, crear cita automáticamente para que aparezca en el calendario
    // La cita usa estado 'pendiente' (sistema de citas) para que funcionen los recordatorios WhatsApp
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
        'pendiente',
        `Sesión #${numeroSesion} - ${tipo}`
      );
      citaIdFinal = Number(citaResult.lastInsertRowid);
    }

    // Insertar sesión
    const result = await db.prepare(`
      INSERT INTO sesiones (
        paciente_id, episodio_id, cita_id, fecha, hora, duracion, tipo, estado,
        numero_sesion, notas_sesion, ejercicios_realizados, observaciones,
        dolor_inicial, dolor_final, borg_percepcion, movilidad, fuerza,
        progreso_general, recomendaciones, proxima_sesion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pacienteId,
      episodioId,
      citaIdFinal,
      fecha,
      hora,
      duracion || 60,
      tipo,
      estado || 'programada',
      numeroSesion,
      notasSesion || null,
      ejerciciosRealizados ? JSON.stringify(ejerciciosRealizados) : null,
      observaciones || null,
      dolorInicial !== undefined && dolorInicial !== null && dolorInicial !== '' ? dolorInicial : null,
      dolorFinal !== undefined && dolorFinal !== null && dolorFinal !== '' ? dolorFinal : null,
      borgPercepcion !== undefined && borgPercepcion !== null && borgPercepcion !== '' ? borgPercepcion : null,
      movilidad || null,
      fuerza || null,
      progresoGeneral || null,
      recomendaciones || null,
      proximaSesion || null
    );

    return NextResponse.json({
      success: true,
      sesion: { 
        id: Number(result.lastInsertRowid),
        episodioId,
        citaId: citaIdFinal,
        numeroSesion,
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
