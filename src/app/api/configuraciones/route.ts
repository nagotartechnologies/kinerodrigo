import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener todas las configuraciones o por categoría
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    let query = 'SELECT * FROM configuraciones';
    const params: any[] = [];

    if (categoria) {
      query += ' WHERE categoria = ?';
      params.push(categoria);
    }

    query += ' ORDER BY categoria, clave';

    const configuraciones = await db.prepare(query).all(...params);

    // Asegurar que configuraciones es un array
    const configArray = Array.isArray(configuraciones) ? configuraciones : [];

    // Convertir valores booleanos
    const configuracionesProcesadas = configArray.map((config: any) => ({
      ...config,
      valor: config.tipo === 'boolean' ? config.valor === 'true' : config.valor
    }));

    return NextResponse.json({
      success: true,
      configuraciones: configuracionesProcesadas
    });
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuraciones' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una configuración
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { clave, valor } = body;

    if (!clave) {
      return NextResponse.json(
        { success: false, error: 'La clave es requerida' },
        { status: 400 }
      );
    }

    // Verificar que la configuración existe
    const configExistente: any = db.prepare(
      'SELECT * FROM configuraciones WHERE clave = ?'
    ).get(clave);

    if (!configExistente) {
      return NextResponse.json(
        { success: false, error: 'Configuración no encontrada' },
        { status: 404 }
      );
    }

    // Convertir valor según el tipo
    let valorFinal = valor;
    if (configExistente.tipo === 'boolean') {
      valorFinal = valor ? 'true' : 'false';
    } else if (configExistente.tipo === 'number') {
      valorFinal = String(valor);
    }

    // Actualizar configuración
    db.prepare(`
      UPDATE configuraciones 
      SET valor = ?, updated_at = CURRENT_TIMESTAMP
      WHERE clave = ?
    `).run(valorFinal, clave);

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}

// POST - Actualizar múltiples configuraciones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configuraciones } = body;

    if (!Array.isArray(configuraciones)) {
      return NextResponse.json(
        { success: false, error: 'Se esperaba un array de configuraciones' },
        { status: 400 }
      );
    }

    const updateStmt = db.prepare(`
      UPDATE configuraciones 
      SET valor = ?, updated_at = CURRENT_TIMESTAMP
      WHERE clave = ?
    `);

    // Actualizar todas las configuraciones en una transacción
    const updateMany = db.transaction((configs: any[]) => {
      for (const config of configs) {
        const configExistente: any = db.prepare(
          'SELECT tipo FROM configuraciones WHERE clave = ?'
        ).get(config.clave);

        if (configExistente) {
          let valorFinal = config.valor;
          if (configExistente.tipo === 'boolean') {
            valorFinal = config.valor ? 'true' : 'false';
          } else if (configExistente.tipo === 'number') {
            valorFinal = String(config.valor);
          }
          updateStmt.run(valorFinal, config.clave);
        }
      }
    });

    updateMany(configuraciones);

    return NextResponse.json({
      success: true,
      message: 'Configuraciones actualizadas exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar configuraciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuraciones' },
      { status: 500 }
    );
  }
}
