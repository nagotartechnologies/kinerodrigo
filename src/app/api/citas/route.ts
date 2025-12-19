import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener todas las citas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const pacienteId = searchParams.get('paciente_id');
    const estado = searchParams.get('estado');

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
        p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
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

    query += ` ORDER BY c.fecha DESC, c.hora DESC`;

    const stmt = db.prepare(query);
    const citas = await stmt.all(...params);

    // Formatear las citas para el frontend
    const citasFormateadas = await Promise.all(citas.map(async (cita: any) => {
      // Buscar si existe una sesión relacionada con esta cita
      const sesion: any = await db.prepare(`
        SELECT id, estado, progreso_general
        FROM sesiones
        WHERE cita_id = ?
        LIMIT 1
      `).get(cita.id);
      
      // Buscar si existen pagos relacionados con esta cita
      const pagos: any[] = await db.prepare(`
        SELECT id, monto, metodo_pago, estado, fecha_pago
        FROM pagos
        WHERE paciente_id = ? AND fecha_pago = ?
        ORDER BY created_at DESC
      `).all(cita.paciente_id, cita.fecha);
      
      const totalPagado = pagos
        .filter(p => p.estado === 'completado')
        .reduce((sum, p) => sum + p.monto, 0);
      
      return {
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
        tieneSesion: !!sesion,
        sesionId: sesion?.id || null,
        sesionEstado: sesion?.estado || null,
        tienePago: pagos.length > 0,
        totalPagado: totalPagado,
        cantidadPagos: pagos.length,
        sesionProgreso: sesion?.progreso_general || null
      };
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

    // Verificar que no haya conflicto de horario
    const conflicto = await db.prepare(`
      SELECT id FROM citas 
      WHERE fecha = ? AND hora = ? AND estado != 'cancelada'
    `).get(fecha, hora);

    if (conflicto) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cita en ese horario' },
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
