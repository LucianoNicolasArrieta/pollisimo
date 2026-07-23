import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DashboardStats } from '@/lib/types';

export async function GET() {
  try {
    // 1. Total ventas entregadas (Efectivo + Transferencia)
    const ventasRows = await query<any[]>(
      `SELECT 
         COALESCE(SUM(total_final), 0) AS total_entregados,
         COALESCE(SUM(CASE WHEN medio_pago = 'Efectivo' THEN total_final ELSE 0 END), 0) AS efectivo,
         COALESCE(SUM(CASE WHEN medio_pago = 'Transferencia' THEN total_final ELSE 0 END), 0) AS transferencia
       FROM ventas
       WHERE estado = 'Entregado'`
    );

    // 2. Gastos acumulados en compras
    const comprasRows = await query<any[]>(
      `SELECT COALESCE(SUM(total), 0) AS total_gastos FROM compras`
    );

    // 3. Pedidos pendientes y reservados
    const pendientesRows = await query<any[]>(
      `SELECT COUNT(*) AS total_pendientes FROM ventas WHERE estado IN ('Reservado', 'Pendiente')`
    );

    // 4. Insumos con bajo stock
    const stockBajoRows = await query<any[]>(
      `SELECT COUNT(*) AS insumos_bajos FROM v_stock_insumos WHERE bajo_stock = 1`
    );

    // 5. Disponibilidad total de bandejas y kilos
    const produccionRows = await query<any[]>(
      `SELECT 
         COALESCE(SUM(bandejas_disponibles), 0) AS bandejas_libres,
         COALESCE(SUM(kilos_disponibles), 0) AS kilos_libres
       FROM v_resumen_produccion`
    );

    const totalVentas = Number(ventasRows[0]?.total_entregados) || 0;
    const totalGastos = Number(comprasRows[0]?.total_gastos) || 0;
    const efectivo = Number(ventasRows[0]?.efectivo) || 0;
    const transferencia = Number(ventasRows[0]?.transferencia) || 0;
    const gananciaNeta = totalVentas - totalGastos;

    const stats: DashboardStats = {
      total_ventas_entregadas: totalVentas,
      total_gastos_compras: totalGastos,
      ingresos_efectivo: efectivo,
      ingresos_transferencia: transferencia,
      ganancia_neta_estimada: gananciaNeta,
      pedidos_pendientes_reservados: Number(pendientesRows[0]?.total_pendientes) || 0,
      insumos_bajo_stock: Number(stockBajoRows[0]?.insumos_bajos) || 0,
      bandejas_disponibles_totales: Number(produccionRows[0]?.bandejas_libres) || 0,
      kilos_disponibles_totales: Number(produccionRows[0]?.kilos_libres) || 0,
      ultima_actualizacion: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
