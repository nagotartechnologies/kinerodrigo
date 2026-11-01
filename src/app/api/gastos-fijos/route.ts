import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Obtener gastos fijos
export async function GET(request: Request) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const gastosFijos = await db.prepare('SELECT * FROM gastos_fijos ORDER BY categoria, descripcion').all();
    return NextResponse.json({ success: true, gastosFijos });
  } catch (error: any) {
    console.error('Error al obtener gastos fijos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener gastos fijos' },
      { status: 500 }
    );
  }
}

// POST - Crear gasto fijo
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await request.json();
    const { categoria, descripcion, monto, diaGeneracion } = body;

    if (!categoria || !descripcion || !monto) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const result = await db.prepare(`
      INSERT INTO gastos_fijos (categoria, descripcion, monto, dia_generacion)
      VALUES (?, ?, ?, ?)
    `).run(categoria, descripcion, monto, diaGeneracion || 1);

    const gastoFijo = await db.prepare('SELECT * FROM gastos_fijos WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ success: true, gastoFijo, message: 'Gasto fijo creado' });
  } catch (error: any) {
    console.error('Error al crear gasto fijo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear gasto fijo' },
      { status: 500 }
    );
  }
}

// PATCH - Generar gastos del mes (auto-generacion)
export async function PATCH(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // formato YYYY-MM

    if (!mes) {
      return NextResponse.json(
        { success: false, error: 'Parametro mes requerido (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Obtener gastos fijos activos
    const gastosFijos: any[] = await db.prepare(
      'SELECT * FROM gastos_fijos WHERE activo = 1'
    ).all();

    let generados = 0;
    let yaExisten = 0;

    for (const gf of gastosFijos) {
      const dia = String(gf.dia_generacion).padStart(2, '0');
      const fechaGasto = `${mes}-${dia}`;

      // Verificar si ya existe un gasto para este mes y gasto fijo
      const existente = await db.prepare(
        `SELECT id FROM gastos WHERE gasto_fijo_id = ? AND fecha_gasto LIKE ?`
      ).get(gf.id, `${mes}%`);

      if (!existente) {
        await db.prepare(`
          INSERT INTO gastos (categoria, descripcion, monto, estado, fecha_gasto, gasto_fijo_id)
          VALUES (?, ?, ?, 'pendiente', ?, ?)
        `).run(gf.categoria, gf.descripcion, gf.monto, fechaGasto, gf.id);
        generados++;
      } else {
        yaExisten++;
      }
    }

    return NextResponse.json({
      success: true,
      generados,
      yaExisten,
      total: gastosFijos.length,
      message: `${generados} gasto(s) generado(s) para ${mes}`
    });
  } catch (error: any) {
    console.error('Error al generar gastos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar gastos' },
      { status: 500 }
    );
  }
}
