import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Producto } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const rows = await query<any[]>(
      `SELECT p.id, p.nombre, p.unidad, p.precio_venta_por_kg, p.costo_estimado_por_kg, 
              p.stock_inicial_kilos, p.stock_inicial_bandejas, p.created_at,
              COALESCE(vr.kilos_disponibles, p.stock_inicial_kilos) AS kilos_disponibles,
              COALESCE(vr.bandejas_disponibles, p.stock_inicial_bandejas) AS bandejas_disponibles,
              COALESCE(vr.kilos_producidos, 0) AS kilos_producidos,
              COALESCE(vr.bandejas_producidas, 0) AS bandejas_producidas,
              COALESCE(vr.kilos_vendidos_reservados, 0) AS kilos_vendidos_reservados,
              COALESCE(vr.bandejas_vendidas_reservadas, 0) AS bandejas_vendidas_reservadas
       FROM productos p
       LEFT JOIN v_resumen_produccion vr ON vr.producto_id = p.id
       ORDER BY p.nombre ASC`
    );
    const productosWithMargen: Producto[] = rows.map((p) => {
      const precio = Number(p.precio_venta_por_kg) || 0;
      const costo = Number(p.costo_estimado_por_kg) || 0;
      const margen = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
      return {
        ...p,
        precio_venta_por_kg: precio,
        costo_estimado_por_kg: costo,
        stock_inicial_kilos: Number(p.stock_inicial_kilos) || 0,
        stock_inicial_bandejas: Number(p.stock_inicial_bandejas) || 0,
        kilos_disponibles: Number(p.kilos_disponibles) || 0,
        bandejas_disponibles: Number(p.bandejas_disponibles) || 0,
        margen_porcentaje: Math.round(margen * 10) / 10,
      };
    });
    return NextResponse.json(productosWithMargen);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, unidad = 'kg', precio_venta_por_kg, costo_estimado_por_kg = 0, stock_inicial_kilos = 0, stock_inicial_bandejas = 0 } = body;
    if (!nombre || !precio_venta_por_kg) {
      return NextResponse.json({ error: 'Nombre y precio por kg son requeridos' }, { status: 400 });
    }
    const id = randomUUID();
    await query(
      'INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg, stock_inicial_kilos, stock_inicial_bandejas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg, stock_inicial_kilos, stock_inicial_bandejas]
    );
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      nombre,
      unidad,
      precio_venta_por_kg,
      costo_estimado_por_kg,
      stock_inicial_kilos,
      stock_inicial_bandejas,
      ajustar_stock_actual,
      stock_actual_kilos,
      stock_actual_bandejas,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    if (ajustar_stock_actual) {
      // Calcular qué stock inicial se necesita para que el stock disponible sea exactamente igual a stock_actual
      const prodRows = await query<any[]>(
        `SELECT 
           COALESCE(SUM(pr.kilos_totales), 0) AS kilos_tandas,
           COALESCE(SUM(pr.bandejas_obtenidas), 0) AS bandejas_tandas
         FROM producciones pr WHERE pr.producto_id = ?`,
        [id]
      );

      const ventRows = await query<any[]>(
        `SELECT 
           COALESCE(SUM(COALESCE(peso_kg, 0)), 0) AS kilos_vendidos,
           COALESCE(SUM(CASE WHEN peso_kg IS NULL THEN 1 ELSE FLOOR(peso_kg) END), 0) AS bandejas_vendidas
         FROM ventas WHERE producto_id = ? AND estado != 'Cancelado'`,
        [id]
      );

      const kilosTandas = Number(prodRows[0]?.kilos_tandas) || 0;
      const bandejasTandas = Number(prodRows[0]?.bandejas_tandas) || 0;
      const kilosVendidos = Number(ventRows[0]?.kilos_vendidos) || 0;
      const bandejasVendidas = Number(ventRows[0]?.bandejas_vendidas) || 0;

      const targetKilos = Number(stock_actual_kilos) || 0;
      const targetBandejas = Number(stock_actual_bandejas) || 0;

      const computedStockInicialKilos = Math.max(0, targetKilos - kilosTandas + kilosVendidos);
      const computedStockInicialBandejas = Math.max(0, targetBandejas - bandejasTandas + bandejasVendidas);

      if (nombre && precio_venta_por_kg !== undefined) {
        await query(
          'UPDATE productos SET nombre = ?, unidad = ?, precio_venta_por_kg = ?, costo_estimado_por_kg = ?, stock_inicial_kilos = ?, stock_inicial_bandejas = ? WHERE id = ?',
          [nombre, unidad || 'kg', precio_venta_por_kg, costo_estimado_por_kg || 0, computedStockInicialKilos, computedStockInicialBandejas, id]
        );
      } else {
        await query(
          'UPDATE productos SET stock_inicial_kilos = ?, stock_inicial_bandejas = ? WHERE id = ?',
          [computedStockInicialKilos, computedStockInicialBandejas, id]
        );
      }
      return NextResponse.json({ success: true });
    }

    await query(
      'UPDATE productos SET nombre = ?, unidad = ?, precio_venta_por_kg = ?, costo_estimado_por_kg = ?, stock_inicial_kilos = ?, stock_inicial_bandejas = ? WHERE id = ?',
      [nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg, stock_inicial_kilos || 0, stock_inicial_bandejas || 0, id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    await query('DELETE FROM productos WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
