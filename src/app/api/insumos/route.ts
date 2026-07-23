import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { InsumoStock } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const rows = await query<InsumoStock[]>(
      'SELECT id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario, total_comprado, total_usado, stock_actual, valor_total_stock, bajo_stock FROM v_stock_insumos ORDER BY nombre ASC'
    );
    const insumosFormatted = rows.map((item) => ({
      ...item,
      stock_inicial: Number(item.stock_inicial) || 0,
      stock_minimo: Number(item.stock_minimo) || 0,
      costo_unitario: Number(item.costo_unitario) || 0,
      total_comprado: Number(item.total_comprado) || 0,
      total_usado: Number(item.total_usado) || 0,
      stock_actual: Number(item.stock_actual) || 0,
      valor_total_stock: Number(item.valor_total_stock) || 0,
      bajo_stock: Boolean(item.bajo_stock),
    }));
    return NextResponse.json(insumosFormatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, unidad, stock_inicial = 0, stock_minimo = 0, costo_unitario = 0 } = body;
    if (!nombre || !unidad) {
      return NextResponse.json({ error: 'Nombre y unidad son requeridos' }, { status: 400 });
    }
    const id = randomUUID();
    await query(
      'INSERT INTO insumos (id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario) VALUES (?, ?, ?, ?, ?, ?)',
      [id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario]
    );
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    await query(
      'UPDATE insumos SET nombre = ?, unidad = ?, stock_inicial = ?, stock_minimo = ?, costo_unitario = ? WHERE id = ?',
      [nombre, unidad, stock_inicial, stock_minimo, costo_unitario, id]
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
    await query('DELETE FROM insumos WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
