import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Migrar pacientes existentes a "Episodio 1" (idempotente)
export async function GET(request: NextRequest) {
  return ejecutarMigracion();
}

// POST - Migrar pacientes existentes a "Episodio 1" (idempotente)
export async function POST(request: NextRequest) {
  return ejecutarMigracion();
}

// Mapeo de estado del paciente al estado del episodio
function mapearEstado(estadoPaciente: string | null): string {
  switch (estadoPaciente) {
    case 'alta':
      return 'alta';
    case 'abandono':
      return 'receso';
    case 'activo':
    default:
      return 'en_tratamiento';
  }
}

async function ejecutarMigracion() {
  try {
    console.log('🔄 Iniciando migración de episodios (Episodio 1)...');

    // Asegurar que la tabla episodios y la columna episodio_id existan
    await db.exec(`
      CREATE TABLE IF NOT EXISTS episodios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        numero_episodio INTEGER NOT NULL DEFAULT 1,
        motivo_lesion TEXT,
        objetivo TEXT,
        evaluacion_fisica TEXT,
        evaluacion_final TEXT,
        estado TEXT DEFAULT 'en_tratamiento',
        fecha_inicio TEXT DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
      )
    `);

    try {
      await db.exec(`ALTER TABLE sesiones ADD COLUMN episodio_id INTEGER`);
    } catch (error) {
      // Columna ya existe, ignorar
    }

    // Obtener todos los pacientes activos
    const pacientes: any[] = await db.prepare(
      'SELECT * FROM pacientes WHERE activo = 1'
    ).all();

    let episodiosCreados = 0;
    let sesionesReasignadas = 0;
    let pacientesOmitidos = 0;

    for (const paciente of pacientes) {
      // Idempotencia: si el paciente ya tiene episodios, no hacer nada
      const episodioExistente: any = await db.prepare(
        'SELECT id FROM episodios WHERE paciente_id = ? LIMIT 1'
      ).get(paciente.id);

      if (episodioExistente) {
        pacientesOmitidos++;
        continue;
      }

      const estadoEpisodio = mapearEstado(paciente.estado_paciente);
      const fechaCierre = estadoEpisodio === 'alta' ? new Date().toISOString() : null;

      // Crear Episodio 1 con los datos clínicos actuales del paciente
      const result: any = await db.prepare(`
        INSERT INTO episodios
          (paciente_id, numero_episodio, motivo_lesion, objetivo, evaluacion_fisica,
           evaluacion_final, estado, fecha_inicio, fecha_cierre)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paciente.id,
        paciente.lesion_consulta || paciente.motivo_consulta || null,
        paciente.objetivo_paciente || null,
        paciente.evaluacion_fisica || null,
        paciente.evaluacion_final || null,
        estadoEpisodio,
        paciente.created_at || new Date().toISOString(),
        fechaCierre
      );

      const episodioId = Number(result.lastInsertRowid);
      episodiosCreados++;

      // Reasignar todas las sesiones sin episodio del paciente a este Episodio 1
      const updateResult: any = await db.prepare(
        'UPDATE sesiones SET episodio_id = ? WHERE paciente_id = ? AND episodio_id IS NULL'
      ).run(episodioId, paciente.id);

      sesionesReasignadas += Number(updateResult.changes || 0);
    }

    console.log(
      `✅ Migración completada: ${episodiosCreados} episodios creados, ` +
      `${sesionesReasignadas} sesiones reasignadas, ${pacientesOmitidos} pacientes omitidos`
    );

    return NextResponse.json({
      success: true,
      message: 'Migración de episodios completada exitosamente',
      detalles: {
        pacientesProcesados: pacientes.length,
        episodiosCreados,
        sesionesReasignadas,
        pacientesOmitidos
      }
    });

  } catch (error: any) {
    console.error('❌ Error en migración de episodios:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al migrar episodios'
      },
      { status: 500 }
    );
  }
}
