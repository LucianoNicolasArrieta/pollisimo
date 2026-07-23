import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Produccion, ResumenProduccion } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    // 1. Obtener Tandas de producción con insumos y costos
    const tandas = await query<any[]>(
      `SELECT pr.id, pr.fecha, pr.numero_produccion, pr.producto_id, p.nombre AS producto_nombre,
              pr.bandejas_obtenidas, pr.kilos_totales, pr.afecta_stock, pr.notas, pr.created_at,
              COALESCE(SUM(pi.cantidad_usada * pi.costo_unitario_historico), 0) AS costo_total_insumos
       FROM producciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN produccion_insumos pi ON pi.produccion_id = pr.id
       GROUP BY pr.id, pr.fecha, pr.numero_produccion, pr.producto_id, p.nombre, pr.bandejas_obtenidas, pr.kilos_totales, pr.afecta_stock, pr.notas, pr.created_at
       ORDER BY pr.numero_produccion DESC, pr.fecha DESC`
    );

    const tandasFormatted: Produccion[] = tandas.map((t) => {
      const costoTotal = Number(t.costo_total_insumos) || 0;
      const kilos = Number(t.kilos_totales) || 0;
      const bandejas = Number(t.bandejas_obtenidas) || 0;
      return {
        ...t,
        bandejas_obtenidas: bandejas,
        kilos_totales: kilos,
        afecta_stock: Boolean(t.afecta_stock),
        costo_total_insumos: costoTotal,
        costo_por_kg: kilos > 0 ? Math.round((costoTotal / kilos) * 100) / 100 : 0,
        costo_por_bandeja: bandejas > 0 ? Math.round((costoTotal / bandejas) * 100) / 100 : 0,
      };
    });

    // 2. Obtener Resumen de disponibilidad por producto
    const resumen = await query<ResumenProduccion[]>(
      `SELECT producto_id, producto_nombre, kilos_producidos, bandejas_producidas,
              kilos_vendidos_reservados, bandejas_vendidas_reservadas, kilos_disponibles, bandejas_disponibles
       FROM v_resumen_produccion
       ORDER BY producto_nombre ASC`
    );

    const resumenFormatted = resumen.map((r) => ({
      ...r,
      kilos_producidos: Number(r.kilos_producidos) || 0,
      bandejas_producidas: Number(r.bandejas_producidas) || 0,
      kilos_vendidos_reservados: Number(r.kilos_vendidos_reservados) || 0,
      bandejas_vendidas_reservadas: Number(r.bandejas_vendidas_reservadas) || 0,
      kilos_disponibles: Number(r.kilos_disponibles) || 0,
      bandejas_disponibles: Number(r.bandejas_disponibles) || 0,
    }));

    return NextResponse.json({ tandas: tandasFormatted, resumen: resumenFormatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fecha = new Date().toISOString().split('T')[0],
      producto_id,
      bandejas_obtenidas,
      kilos_totales,
      afecta_stock = true,
      notas = '',
      insumos_usados = [], // Array de { insumo_id, cantidad_usada }
    } = body;

    if (!producto_id || !bandejas_obtenidas || !kilos_totales) {
      return NextResponse.json(
        { error: 'Producto, bandejas obtenidas y kilos totales son requeridos' },
        { status: 400 }
      );
    }

    const produccion_id = randomUUID();
    await query(
      'INSERT INTO producciones (id, fecha, producto_id, bandejas_obtenidas, kilos_totales, afecta_stock, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [produccion_id, fecha, producto_id, bandejas_obtenidas, kilos_totales, afecta_stock ? 1 : 0, notas]
    );

    // Obtener los costos unitarios actuales de los insumos seleccionados
    for (const item of insumos_usados) {
      if (item.insumo_id && item.cantidad_usada > 0) {
        const insumoRows = await query<any[]>('SELECT costo_unitario FROM insumos WHERE id = ?', [item.insumo_id]);
        const costoUnitario = insumoRows.length > 0 ? Number(insumoRows[0].costo_unitario) : 0;

        await query(
          'INSERT INTO produccion_insumos (id, produccion_id, insumo_id, cantidad_usada, costo_unitario_historico) VALUES (?, ?, ?, ?, ?)',
          [randomUUID(), produccion_id, item.insumo_id, item.cantidad_usada, costoUnitario]
        );
      }
    }

    return NextResponse.json({ success: true, id: produccion_id });
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
    await query('DELETE FROM producciones WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
