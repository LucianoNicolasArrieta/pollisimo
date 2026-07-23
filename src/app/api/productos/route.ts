import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Producto } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const rows = await query<Producto[]>(
      'SELECT id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg, created_at FROM productos ORDER BY nombre ASC'
    );
    const productosWithMargen = rows.map((p) => {
      const precio = Number(p.precio_venta_por_kg) || 0;
      const costo = Number(p.costo_estimado_por_kg) || 0;
      const margen = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
      return {
        ...p,
        precio_venta_por_kg: precio,
        costo_estimado_por_kg: costo,
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
    const { nombre, unidad = 'kg', precio_venta_por_kg, costo_estimado_por_kg = 0 } = body;
    if (!nombre || !precio_venta_por_kg) {
      return NextResponse.json({ error: 'Nombre y precio por kg son requeridos' }, { status: 400 });
    }
    const id = randomUUID();
    await query(
      'INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg) VALUES (?, ?, ?, ?, ?)',
      [id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg]
    );
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    await query(
      'UPDATE productos SET nombre = ?, unidad = ?, precio_venta_por_kg = ?, costo_estimado_por_kg = ? WHERE id = ?',
      [nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg, id]
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
