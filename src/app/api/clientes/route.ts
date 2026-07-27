import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Cliente, ClienteConStats, StatsClientesGlobales } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    let sqlWhere = '';
    let params: any[] = [];
    if (q) {
      sqlWhere = 'WHERE LOWER(c.nombre) LIKE ? OR LOWER(COALESCE(c.telefono, "")) LIKE ? OR LOWER(COALESCE(c.direccion, "")) LIKE ?';
      const term = `%${q.toLowerCase()}%`;
      params = [term, term, term];
    }

    const rows = await query<any[]>(
      `SELECT 
         c.id, c.nombre, c.direccion, c.telefono, c.created_at,
         COUNT(v.id) AS total_ventas,
         COALESCE(SUM(CASE WHEN v.estado != 'Cancelado' THEN v.total_final ELSE 0 END), 0) AS total_gastado,
         COALESCE(SUM(CASE WHEN v.estado != 'Cancelado' THEN COALESCE(v.peso_kg, 0) ELSE 0 END), 0) AS total_kilos,
         COALESCE(SUM(CASE WHEN v.estado != 'Cancelado' THEN (CASE WHEN v.cantidad_bandejas IS NOT NULL AND v.cantidad_bandejas > 0 THEN v.cantidad_bandejas WHEN v.peso_kg IS NULL THEN 1 ELSE FLOOR(v.peso_kg) END) ELSE 0 END), 0) AS total_bandejas,
         MAX(v.fecha) AS ultima_compra
       FROM clientes c
       LEFT JOIN ventas v ON v.cliente_id = c.id OR (v.cliente_id IS NULL AND LOWER(v.cliente) = LOWER(c.nombre))
       ${sqlWhere}
       GROUP BY c.id, c.nombre, c.direccion, c.telefono, c.created_at
       ORDER BY total_gastado DESC, c.nombre ASC`,
      params
    );

    const clientesFormatted: ClienteConStats[] = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      direccion: r.direccion || '',
      telefono: r.telefono || '',
      created_at: r.created_at,
      total_ventas: Number(r.total_ventas) || 0,
      total_gastado: Number(r.total_gastado) || 0,
      total_kilos: Number(r.total_kilos) || 0,
      total_bandejas: Number(r.total_bandejas) || 0,
      ultima_compra: r.ultima_compra || null,
      ticket_promedio: Number(r.total_ventas) > 0 ? (Number(r.total_gastado) / Number(r.total_ventas)) : 0,
    }));

    // Global client statistics
    const totalClientes = clientesFormatted.length;
    const totalGastadoGlobal = clientesFormatted.reduce((acc, curr) => acc + curr.total_gastado, 0);
    const totalVentasGlobal = clientesFormatted.reduce((acc, curr) => acc + curr.total_ventas, 0);
    const ticketPromedioGlobal = totalVentasGlobal > 0 ? totalGastadoGlobal / totalVentasGlobal : 0;
    const clienteVip = clientesFormatted.length > 0 ? clientesFormatted[0].nombre : '-';

    const statsGlobales: StatsClientesGlobales = {
      total_clientes: totalClientes,
      ticket_promedio_global: ticketPromedioGlobal,
      total_recaudado: totalGastadoGlobal,
      cliente_vip: clienteVip,
    };

    return NextResponse.json({ clientes: clientesFormatted, stats: statsGlobales });
  } catch (error: any) {
    console.error('Error in GET /api/clientes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, direccion = '', telefono = '' } = body;
    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 });
    }

    const cleanNombre = nombre.trim();
    // Check if client already exists (case insensitive)
    const existing = await query<any[]>('SELECT id, nombre FROM clientes WHERE LOWER(nombre) = LOWER(?)', [cleanNombre]);
    if (existing.length > 0) {
      return NextResponse.json({ success: true, id: existing[0].id, nombre: existing[0].nombre, existed: true });
    }

    const id = randomUUID();
    await query(
      'INSERT INTO clientes (id, nombre, direccion, telefono) VALUES (?, ?, ?, ?)',
      [id, cleanNombre, direccion, telefono]
    );

    return NextResponse.json({ success: true, id, nombre: cleanNombre, existed: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nombre, direccion = '', telefono = '' } = body;
    if (!id || !nombre) {
      return NextResponse.json({ error: 'ID y Nombre son requeridos' }, { status: 400 });
    }

    await query(
      'UPDATE clientes SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
      [nombre.trim(), direccion, telefono, id]
    );

    // Keep ventas table updated with the new name if matching
    await query('UPDATE ventas SET cliente = ? WHERE cliente_id = ?', [nombre.trim(), id]);

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
    await query('DELETE FROM clientes WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
