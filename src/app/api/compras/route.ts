import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Compra } from '@/lib/types';
import { getTodayLocalDateString } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const rows = await query<any[]>(
      `SELECT c.id, c.fecha, c.insumo_id, i.nombre AS insumo_nombre, i.unidad AS insumo_unidad,
              c.cantidad, c.costo_unitario, c.total, c.proveedor, c.notas, c.afecta_stock, c.created_at
       FROM compras c
       JOIN insumos i ON i.id = c.insumo_id
       ORDER BY c.fecha DESC, c.created_at DESC`
    );
    const comprasFormatted: Compra[] = rows.map((c) => ({
      ...c,
      cantidad: Number(c.cantidad) || 0,
      costo_unitario: Number(c.costo_unitario) || 0,
      total: Number(c.total) || 0,
      afecta_stock: Boolean(c.afecta_stock),
    }));
    return NextResponse.json(comprasFormatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fecha = getTodayLocalDateString(),
      insumo_id,
      cantidad,
      costo_unitario,
      proveedor = '',
      notas = '',
      afecta_stock = true,
      actualizar_costo_insumo = true,
    } = body;

    if (!insumo_id || !cantidad || !costo_unitario) {
      return NextResponse.json({ error: 'Insumo, cantidad y costo unitario son requeridos' }, { status: 400 });
    }

    const id = randomUUID();
    await query(
      'INSERT INTO compras (id, fecha, insumo_id, cantidad, costo_unitario, proveedor, notas, afecta_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, fecha, insumo_id, cantidad, costo_unitario, proveedor, notas, afecta_stock ? 1 : 0]
    );

    if (actualizar_costo_insumo) {
      await query('UPDATE insumos SET costo_unitario = ? WHERE id = ?', [costo_unitario, insumo_id]);
    }

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
      fecha = getTodayLocalDateString(),
      insumo_id,
      cantidad,
      costo_unitario,
      proveedor = '',
      notas = '',
      afecta_stock = true,
      actualizar_costo_insumo = true,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    if (!insumo_id || !cantidad || !costo_unitario) {
      return NextResponse.json({ error: 'Insumo, cantidad y costo unitario son requeridos' }, { status: 400 });
    }

    await query(
      'UPDATE compras SET fecha = ?, insumo_id = ?, cantidad = ?, costo_unitario = ?, proveedor = ?, notas = ?, afecta_stock = ? WHERE id = ?',
      [fecha, insumo_id, cantidad, costo_unitario, proveedor, notas, afecta_stock ? 1 : 0, id]
    );

    if (actualizar_costo_insumo) {
      await query('UPDATE insumos SET costo_unitario = ? WHERE id = ?', [costo_unitario, insumo_id]);
    }

    return NextResponse.json({ success: true, id });
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
    await query('DELETE FROM compras WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
