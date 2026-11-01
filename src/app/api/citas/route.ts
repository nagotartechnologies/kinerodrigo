import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener todas las citas
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const pacienteId = searchParams.get('paciente_id');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const sinFiltro = searchParams.get('sinFiltro');

    let query = `
      SELECT 
        c.id,
        c.paciente_id,
        c.fecha,
        c.hora,
        c.duracion,
        c.tipo,
        c.estado,
        c.notas,
        c.created_at,
        c.updated_at,
        p.nombre as paciente_nombre,
        p.rut as paciente_rut,
        p.telefono as paciente_telefono,
        s.id as sesion_id,
        s.estado as sesion_estado,
        s.progreso_general as sesion_progreso,
        r.id as recordatorio_id,
        r.estado as recordatorio_estado,
        r.respuesta as recordatorio_respuesta,
        r.enviado_at as recordatorio_enviado_at,
        r.cancelacion_tardia as recordatorio_cancelacion_tardia
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN sesiones s ON s.cita_id = c.id
      LEFT JOIN (
        SELECT cita_id, id, estado, respuesta, enviado_at, cancelacion_tardia
        FROM recordatorios
        WHERE id IN (
          SELECT MAX(id) FROM recordatorios WHERE estado != 'obsoleto' GROUP BY cita_id
        )
      ) r ON r.cita_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (fecha) {
      query += ` AND c.fecha = ?`;
      params.push(fecha);
    }

    if (pacienteId) {
      query += ` AND c.paciente_id = ?`;
      params.push(parseInt(pacienteId));
    }

    if (estado) {
      query += ` AND c.estado = ?`;
      params.push(estado);
    }

    if (fechaDesde) {
      query += ` AND c.fecha >= ?`;
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ` AND c.fecha <= ?`;
      params.push(fechaHasta);
    }

    // Filtro por defecto: últimas 8 semanas si no hay fecha exacta, rango explícito ni sinFiltro
    if (!fecha && !fechaDesde && !fechaHasta && !sinFiltro) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 56);
      const fechaLimiteStr = `${fechaLimite.getFullYear()}-${String(fechaLimite.getMonth() + 1).padStart(2, '0')}-${String(fechaLimite.getDate()).padStart(2, '0')}`;
      query += ` AND c.fecha >= ?`;
      params.push(fechaLimiteStr);
    }

    query += ` ORDER BY c.fecha DESC, c.hora DESC`;

    const stmt = db.prepare(query);
    const citas = await stmt.all(...params);

    // Formatear las citas para el frontend (sin queries adicionales)
    const citasFormateadas = citas.map((cita: any) => ({
      id: cita.id,
      pacienteId: cita.paciente_id,
      paciente: cita.paciente_nombre,
      rut: cita.paciente_rut,
      telefono: cita.paciente_telefono,
      fecha: cita.fecha,
      hora: cita.hora,
      duracion: cita.duracion,
      tipo: cita.tipo,
      estado: cita.estado,
      notas: cita.notas,
      createdAt: cita.created_at,
      updatedAt: cita.updated_at,
      tieneSesion: !!cita.sesion_id,
      sesionId: cita.sesion_id || null,
      sesionEstado: cita.sesion_estado || null,
      sesionProgreso: cita.sesion_progreso || null,
      tienePago: false,
      totalPagado: 0,
      cantidadPagos: 0,
      recordatorio: cita.recordatorio_id ? {
        id: cita.recordatorio_id,
        estado: cita.recordatorio_estado,
        respuesta: cita.recordatorio_respuesta,
        enviadoAt: cita.recordatorio_enviado_at,
        cancelacionTardia: !!cita.recordatorio_cancelacion_tardia
      } : null
    }));

    return NextResponse.json({
      success: true,
      citas: citasFormateadas,
      total: citasFormateadas.length
    });

  } catch (error: any) {
    console.error('Error al obtener citas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener las citas' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva cita
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pacienteId, fecha, hora, duracion, tipo, notas } = body;

    // Validaciones
    if (!pacienteId || !fecha || !hora || !tipo) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el paciente existe
    const paciente = await db.prepare('SELECT id, nombre FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar conflictos de horario (considerando duración)
    // Se permite un máximo de 2 citas simultáneas en el mismo horario
    // Dos rangos se solapan si: inicio1 < fin2 AND inicio2 < fin1
    const duracionNueva = duracion || 60;
    const conflictos: any[] = await db.prepare(`
      SELECT id, hora, duracion FROM citas 
      WHERE fecha = ? AND estado != 'cancelada'
        AND (
          (CAST(substr(hora, 1, 2) AS INTEGER) * 60 + CAST(substr(hora, 4, 2) AS INTEGER))
          < (CAST(substr(?, 1, 2) AS INTEGER) * 60 + CAST(substr(?, 4, 2) AS INTEGER) + ?)
        )
        AND (
          (CAST(substr(?, 1, 2) AS INTEGER) * 60 + CAST(substr(?, 4, 2) AS INTEGER))
          < (CAST(substr(hora, 1, 2) AS INTEGER) * 60 + CAST(substr(hora, 4, 2) AS INTEGER) + duracion)
        )
    `).all(fecha, hora, hora, duracionNueva, hora, hora);

    if (conflictos.length >= 2) {
      return NextResponse.json(
        { success: false, error: 'Ya hay 2 citas agendadas en ese horario (máximo permitido)' },
        { status: 409 }
      );
    }

    // Insertar la cita
    const stmt = db.prepare(`
      INSERT INTO citas (paciente_id, fecha, hora, duracion, tipo, notas, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
    `);

    const result = await stmt.run(
      pacienteId,
      fecha,
      hora,
      duracion || 60,
      tipo,
      notas || null
    );

    // Obtener la cita creada con información del paciente
    const citaCreada: any = await db.prepare(`
      SELECT 
        c.id,
        c.paciente_id,
        c.fecha,
        c.hora,
        c.duracion,
        c.tipo,
        c.estado,
        c.notas,
        c.created_at,
        c.updated_at,
        p.nombre as paciente_nombre,
        p.rut as paciente_rut,
        p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      message: 'Cita creada exitosamente',
      cita: {
        id: citaCreada.id,
        pacienteId: citaCreada.paciente_id,
        paciente: citaCreada.paciente_nombre,
        rut: citaCreada.paciente_rut,
        telefono: citaCreada.paciente_telefono,
        fecha: citaCreada.fecha,
        hora: citaCreada.hora,
        duracion: citaCreada.duracion,
        tipo: citaCreada.tipo,
        estado: citaCreada.estado,
        notas: citaCreada.notas,
        createdAt: citaCreada.created_at,
        updatedAt: citaCreada.updated_at
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la cita' },
      { status: 500 }
    );
  }
}
