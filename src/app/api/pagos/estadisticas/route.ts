import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // formato: YYYY-MM
    const anio = searchParams.get('anio'); // formato: YYYY

    // Total de pagos
    const totalPagos: any = await db.prepare('SELECT COUNT(*) as total FROM pagos').get();

    // Ingresos totales
    const ingresosTotales: any = await db.prepare(`
      SELECT COALESCE(SUM(monto), 0) as total 
      FROM pagos 
      WHERE estado = 'completado'
    `).get();

    // Ingresos del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const finMes = new Date(inicioMes);
    finMes.setMonth(finMes.getMonth() + 1);

    const ingresosMes: any = await db.prepare(`
      SELECT COALESCE(SUM(monto), 0) as total 
      FROM pagos 
      WHERE estado = 'completado'
        AND fecha_pago >= ?
        AND fecha_pago < ?
    `).get(
      inicioMes.toISOString().split('T')[0],
      finMes.toISOString().split('T')[0]
    );

    // Pagos pendientes
    const pagosPendientes: any = await db.prepare(`
      SELECT COUNT(*) as total, COALESCE(SUM(monto), 0) as monto_total
      FROM pagos 
      WHERE estado = 'pendiente'
    `).get();

    // Pagos por método de pago
    const porMetodoPago = await db.prepare(`
      SELECT 
        metodo_pago,
        COUNT(*) as cantidad,
        COALESCE(SUM(monto), 0) as total
      FROM pagos
      WHERE estado = 'completado'
      GROUP BY metodo_pago
      ORDER BY total DESC
    `).all();

    // Pagos por estado
    const porEstado = await db.prepare(`
      SELECT 
        estado,
        COUNT(*) as cantidad,
        COALESCE(SUM(monto), 0) as total
      FROM pagos
      GROUP BY estado
    `).all();

    // Últimos 10 pagos
    const ultimosPagos = await db.prepare(`
      SELECT 
        p.*,
        pac.nombre as paciente_nombre,
        pac.rut as paciente_rut
      FROM pagos p
      INNER JOIN pacientes pac ON p.paciente_id = pac.id
      ORDER BY p.fecha_pago DESC, p.created_at DESC
      LIMIT 10
    `).all();

    // Ingresos por mes (últimos 12 meses)
    const ingresosPorMes = await db.prepare(`
      SELECT 
        strftime('%Y-%m', fecha_pago) as mes,
        COALESCE(SUM(monto), 0) as total,
        COUNT(*) as cantidad
      FROM pagos
      WHERE estado = 'completado'
        AND fecha_pago >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', fecha_pago)
      ORDER BY mes DESC
    `).all();

    // Top 5 pacientes con más pagos
    const topPacientes = await db.prepare(`
      SELECT 
        pac.id,
        pac.nombre,
        pac.rut,
        COUNT(p.id) as total_pagos,
        COALESCE(SUM(p.monto), 0) as total_monto
      FROM pacientes pac
      INNER JOIN pagos p ON pac.id = p.paciente_id
      WHERE p.estado = 'completado'
      GROUP BY pac.id, pac.nombre, pac.rut
      ORDER BY total_monto DESC
      LIMIT 5
    `).all();

    return NextResponse.json({
      success: true,
      estadisticas: {
        totalPagos: totalPagos.total,
        ingresosTotales: ingresosTotales.total,
        ingresosMes: ingresosMes.total,
        pagosPendientes: {
          cantidad: pagosPendientes.total,
          monto: pagosPendientes.monto_total
        },
        porMetodoPago,
        porEstado,
        ultimosPagos,
        ingresosPorMes,
        topPacientes
      }
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
