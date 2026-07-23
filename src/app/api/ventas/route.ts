import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Venta } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const rows = await query<any[]>(
      `SELECT v.id, v.fecha, v.cliente, v.producto_id, p.nombre AS producto_nombre,
              v.peso_kg, v.precio_por_kg, v.precio_calculado, v.total_final, v.medio_pago, v.estado, v.notas, v.created_at
       FROM ventas v
       JOIN productos p ON p.id = v.producto_id
       ORDER BY v.fecha DESC, v.created_at DESC`
    );

    const ventasFormatted: Venta[] = rows.map((v) => ({
      ...v,
      peso_kg: v.peso_kg !== null && v.peso_kg !== undefined ? Number(v.peso_kg) : null,
      precio_por_kg: Number(v.precio_por_kg) || 0,
      precio_calculado: Number(v.precio_calculado) || 0,
      total_final: Number(v.total_final) || 0,
    }));

    return NextResponse.json(ventasFormatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fecha = new Date().toISOString().split('T')[0],
      cliente,
      producto_id,
      peso_kg = null,
      precio_por_kg,
      medio_pago = 'Efectivo',
      estado = 'Pendiente',
      notas = '',
    } = body;

    if (!cliente || !producto_id) {
      return NextResponse.json({ error: 'Cliente y producto son requeridos' }, { status: 400 });
    }

    // Si no enviaron precio_por_kg, obtenerlo del producto
    let precioKg = precio_por_kg;
    if (!precioKg) {
      const prodRows = await query<any[]>('SELECT precio_venta_por_kg FROM productos WHERE id = ?', [producto_id]);
      if (prodRows.length > 0) {
        precioKg = Number(prodRows[0].precio_venta_por_kg);
      } else {
        precioKg = 0;
      }
    }

    const id = randomUUID();
    const parsedPeso = peso_kg !== null && peso_kg !== '' && !isNaN(Number(peso_kg)) ? Number(peso_kg) : null;

    await query(
      'INSERT INTO ventas (id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, fecha, cliente, producto_id, parsedPeso, precioKg, medio_pago, estado, notas]
    );

    // Obtener la venta recién insertada con los valores calculados por el trigger
    const createdRows = await query<any[]>('SELECT * FROM ventas WHERE id = ?', [id]);

    return NextResponse.json({ success: true, venta: createdRows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const parsedPeso = peso_kg !== null && peso_kg !== '' && !isNaN(Number(peso_kg)) ? Number(peso_kg) : null;

    await query(
      `UPDATE ventas
       SET fecha = ?, cliente = ?, producto_id = ?, peso_kg = ?, precio_por_kg = ?, medio_pago = ?, estado = ?, notas = ?
       WHERE id = ?`,
      [fecha, cliente, producto_id, parsedPeso, precio_por_kg, medio_pago, estado, notas, id]
    );

    const updatedRows = await query<any[]>('SELECT * FROM ventas WHERE id = ?', [id]);
    return NextResponse.json({ success: true, venta: updatedRows[0] });
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
    await query('DELETE FROM ventas WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
