import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Resumen financiero mensual unificado (ingresos + gastos + balance)
export async function GET(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // formato YYYY-MM

    // Si no se especifica mes, usar el actual
    const now = new Date();
    const mesActual = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [anio, mesNum] = mesActual.split('-');
    
    // Calcular rango del mes
    const inicioMes = `${mesActual}-01`;
    const finMesDate = new Date(parseInt(anio), parseInt(mesNum), 0);
    const finMes = `${mesActual}-${String(finMesDate.getDate()).padStart(2, '0')}`;

    // Ingresos del mes (pagos completados)
    const ingresosMes: any = await db.prepare(`
      SELECT 
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM pagos 
      WHERE estado = 'completado'
        AND fecha_pago >= ? AND fecha_pago <= ?
    `).get(inicioMes, finMes);

    // Gastos del mes (pagados)
    const gastosMesPagados: any = await db.prepare(`
      SELECT 
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM gastos 
      WHERE estado = 'pagado'
        AND fecha_gasto >= ? AND fecha_gasto <= ?
    `).get(inicioMes, finMes);

    // Gastos pendientes del mes
    const gastosMesPendientes: any = await db.prepare(`
      SELECT 
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM gastos 
      WHERE estado = 'pendiente'
        AND fecha_gasto >= ? AND fecha_gasto <= ?
    `).get(inicioMes, finMes);

    // Total gastos del mes (pagados + pendientes)
    const gastosMesTotal: any = await db.prepare(`
      SELECT 
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM gastos 
      WHERE fecha_gasto >= ? AND fecha_gasto <= ?
    `).get(inicioMes, finMes);

    // Movimientos del mes (ingresos + gastos combinados)
    const ingresos: any[] = await db.prepare(`
      SELECT 
        p.id,
        'ingreso' as tipo,
        p.fecha_pago as fecha,
        COALESCE(p.concepto, s.tipo, 'Pago general') as descripcion,
        'Pago sesion' as categoria,
        p.metodo_pago,
        p.monto,
        p.estado,
        pac.nombre as detalle
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      LEFT JOIN sesiones s ON p.sesion_id = s.id
      WHERE p.fecha_pago >= ? AND p.fecha_pago <= ?
      ORDER BY p.fecha_pago DESC
    `).all(inicioMes, finMes);

    const gastos: any[] = await db.prepare(`
      SELECT 
        id,
        'gasto' as tipo,
        fecha_gasto as fecha,
        descripcion,
        categoria,
        metodo_pago,
        monto,
        estado,
        NULL as detalle
      FROM gastos
      WHERE fecha_gasto >= ? AND fecha_gasto <= ?
      ORDER BY fecha_gasto DESC
    `).all(inicioMes, finMes);

    // Combinar y ordenar por fecha DESC
    const movimientos = [...ingresos, ...gastos].sort((a, b) => {
      if (b.fecha !== a.fecha) return b.fecha.localeCompare(a.fecha);
      return 0;
    });

    // Gastos por categoria del mes
    const gastosPorCategoria: any[] = await db.prepare(`
      SELECT 
        categoria,
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM gastos
      WHERE fecha_gasto >= ? AND fecha_gasto <= ?
      GROUP BY categoria
      ORDER BY total DESC
    `).all(inicioMes, finMes);

    const balance = ingresosMes.total - gastosMesTotal.total;

    return NextResponse.json({
      success: true,
      resumen: {
        mes: mesActual,
        ingresos: {
          total: ingresosMes.total,
          cantidad: ingresosMes.cantidad
        },
        gastos: {
          total: gastosMesTotal.total,
          cantidad: gastosMesTotal.cantidad,
          pagados: gastosMesPagados.total,
          pendientes: {
            total: gastosMesPendientes.total,
            cantidad: gastosMesPendientes.cantidad
          }
        },
        balance,
        movimientos,
        gastosPorCategoria
      }
    });
  } catch (error: any) {
    console.error('Error al obtener resumen financiero:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener resumen' },
      { status: 500 }
    );
  }
}
