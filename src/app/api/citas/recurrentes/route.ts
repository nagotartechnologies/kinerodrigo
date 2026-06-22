import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// POST - Crear citas recurrentes
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pacienteId, horaInicio, duracion, tipo, notas, frecuencia, cantidadSemanas, diasSemana } = body;

    // Validaciones
    if (!pacienteId || !horaInicio || !tipo || !cantidadSemanas || !diasSemana || diasSemana.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el paciente existe
    const paciente: any = await db.prepare('SELECT id, nombre FROM pacientes WHERE id = ? AND activo = 1').get(pacienteId);
    if (!paciente) {
      return NextResponse.json(
        { success: false, error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    const duracionCita = duracion || 60;
    const citasCreadas: any[] = [];
    const conflictos: any[] = [];
    
    // Generar fechas para las próximas N semanas
    const hoy = new Date();
    const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    // Mapeo de días: 0=domingo, 1=lunes, ..., 6=sábado
    for (let semana = 0; semana < cantidadSemanas; semana++) {
      for (const diaSemana of diasSemana) {
        // Calcular la fecha del próximo día de la semana
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + (semana * 7));
        
        // Ajustar al día de la semana correcto
        const diaActual = fecha.getDay();
        let diasHastaTarget = diaSemana - diaActual;
        if (diasHastaTarget < 0) diasHastaTarget += 7;
        if (semana === 0 && diasHastaTarget === 0) {
          // Si es hoy y es el día correcto, incluirlo
        } else if (semana === 0 && diasHastaTarget < 0) {
          diasHastaTarget += 7;
        }
        fecha.setDate(fecha.getDate() + diasHastaTarget);

        // Formatear fecha como YYYY-MM-DD
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}`;

        // Verificar conflicto de horario
        const conflicto: any = await db.prepare(`
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
        `).get(fechaStr, horaInicio, horaInicio, duracionCita, horaInicio, horaInicio);

        if (conflicto) {
          conflictos.push({ fecha: fechaStr, hora: horaInicio, motivo: 'Conflicto de horario' });
          continue;
        }

        // Crear la cita
        const result = await db.prepare(`
          INSERT INTO citas (paciente_id, fecha, hora, duracion, tipo, notas, estado)
          VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
        `).run(pacienteId, fechaStr, horaInicio, duracionCita, tipo, notas || null);

        citasCreadas.push({
          id: Number(result.lastInsertRowid),
          fecha: fechaStr,
          hora: horaInicio,
          duracion: duracionCita,
          tipo,
          estado: 'pendiente'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${citasCreadas.length} citas creadas exitosamente${conflictos.length > 0 ? `, ${conflictos.length} omitidas por conflicto` : ''}`,
      citasCreadas,
      conflictos,
      totalCreadas: citasCreadas.length,
      totalConflictos: conflictos.length
    });

  } catch (error: any) {
    console.error('Error al crear citas recurrentes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear citas recurrentes' },
      { status: 500 }
    );
  }
}
