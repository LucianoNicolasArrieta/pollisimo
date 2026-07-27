import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Venta } from '@/lib/types';
import { getTodayLocalDateString } from '@/lib/utils';
import { randomUUID } from 'crypto';

async function resolveClientId(clienteName: string, clienteIdInput?: string): Promise<{ id: string; nombre: string }> {
  const cleanName = clienteName.trim();
  if (clienteIdInput) {
    const existingById = await query<any[]>('SELECT id, nombre FROM clientes WHERE id = ?', [clienteIdInput]);
    if (existingById.length > 0) {
      return { id: existingById[0].id, nombre: existingById[0].nombre };
    }
  }

  // Case-insensitive search by name
  const existingByName = await query<any[]>('SELECT id, nombre FROM clientes WHERE LOWER(nombre) = LOWER(?)', [cleanName]);
  if (existingByName.length > 0) {
    return { id: existingByName[0].id, nombre: existingByName[0].nombre };
  }

  // Create new client on the fly
  const newId = randomUUID();
  await query('INSERT INTO clientes (id, nombre) VALUES (?, ?)', [newId, cleanName]);
  return { id: newId, nombre: cleanName };
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    await query('ALTER TABLE ventas ADD COLUMN cantidad_bandejas INT DEFAULT 1');
  } catch (e) {
    try {
      await query('ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cantidad_bandejas INT DEFAULT 1');
    } catch (e2) {}
  }
  try {
    await query(`
      UPDATE ventas 
      SET cantidad_bandejas = CASE 
        WHEN peso_kg IS NOT NULL THEN GREATEST(1, FLOOR(peso_kg)) 
        ELSE COALESCE(cantidad_bandejas, 1) 
      END
    `);
  } catch (e) {}
  try {
    await query(`
      CREATE OR REPLACE VIEW v_resumen_produccion AS
      SELECT 
        p.id AS producto_id,
        p.nombre AS producto_nombre,
        (COALESCE(p.stock_inicial_kilos, 0) + COALESCE(prod.kilos_producidos, 0)) AS kilos_producidos,
        (COALESCE(p.stock_inicial_bandejas, 0) + COALESCE(prod.bandejas_producidas, 0)) AS bandejas_producidas,
        COALESCE(v.kilos_vendidos_reservados, 0) AS kilos_vendidos_reservados,
        COALESCE(v.bandejas_vendidas_reservadas, 0) AS bandejas_vendidas_reservadas,
        ((COALESCE(p.stock_inicial_kilos, 0) + COALESCE(prod.kilos_producidos, 0)) - COALESCE(v.kilos_vendidos_reservados, 0)) AS kilos_disponibles,
        ((COALESCE(p.stock_inicial_bandejas, 0) + COALESCE(prod.bandejas_producidas, 0)) - COALESCE(v.bandejas_vendidas_reservadas, 0)) AS bandejas_disponibles
      FROM productos p
      LEFT JOIN (
        SELECT producto_id, SUM(kilos_totales) AS kilos_producidos, SUM(bandejas_obtenidas) AS bandejas_producidas
        FROM producciones
        GROUP BY producto_id
      ) prod ON prod.producto_id = p.id
      LEFT JOIN (
        SELECT 
          producto_id, 
          SUM(
            CASE 
              WHEN peso_kg IS NOT NULL THEN peso_kg 
              ELSE COALESCE(cantidad_bandejas, 1) * 1.0 
            END
          ) AS kilos_vendidos_reservados,
          SUM(
            CASE 
              WHEN peso_kg IS NOT NULL THEN GREATEST(1, FLOOR(peso_kg)) 
              ELSE COALESCE(cantidad_bandejas, 1) 
            END
          ) AS bandejas_vendidas_reservadas
        FROM ventas
        WHERE estado != 'Cancelado'
        GROUP BY producto_id
      ) v ON v.producto_id = p.id
    `);
  } catch (e) {}
  schemaEnsured = true;
}

export async function GET() {
  try {
    await ensureSchema();
    const rows = await query<any[]>(
      `SELECT v.id, v.fecha, v.cliente, v.cliente_id, c.direccion AS cliente_direccion, c.telefono AS cliente_telefono,
              v.producto_id, p.nombre AS producto_nombre,
              v.peso_kg, v.cantidad_bandejas, v.precio_por_kg, v.precio_calculado, v.total_final, v.medio_pago,
              v.monto_efectivo, v.monto_transferencia, v.estado, v.notas, v.created_at
       FROM ventas v
       JOIN productos p ON p.id = v.producto_id
       LEFT JOIN clientes c ON c.id = v.cliente_id OR LOWER(c.nombre) = LOWER(v.cliente)
       ORDER BY v.fecha DESC, v.created_at DESC`
    );

    const ventasFormatted: Venta[] = rows.map((v) => {
      const pKg = v.peso_kg !== null && v.peso_kg !== undefined ? Number(v.peso_kg) : null;
      return {
        ...v,
        fecha: v.fecha ? String(v.fecha).split('T')[0].substring(0, 10) : getTodayLocalDateString(),
        peso_kg: pKg,
        cantidad_bandejas: pKg !== null ? Math.max(1, Math.floor(pKg)) : (Number(v.cantidad_bandejas) || 1),
        precio_por_kg: Number(v.precio_por_kg) || 0,
        precio_calculado: Number(v.precio_calculado) || 0,
        total_final: Number(v.total_final) || 0,
        monto_efectivo: Number(v.monto_efectivo) || 0,
        monto_transferencia: Number(v.monto_transferencia) || 0,
      };
    });

    return NextResponse.json(ventasFormatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const {
      fecha = getTodayLocalDateString(),
      cliente,
      cliente_id,
      producto_id,
      peso_kg = null,
      cantidad_bandejas,
      precio_por_kg,
      medio_pago = 'Efectivo',
      monto_efectivo = 0,
      monto_transferencia = 0,
      estado = 'Pendiente',
      notas = '',
    } = body;

    if (!cliente || !producto_id) {
      return NextResponse.json({ error: 'Cliente y producto son requeridos' }, { status: 400 });
    }

    const { id: resolvedClienteId, nombre: resolvedClienteNombre } = await resolveClientId(cliente, cliente_id);

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
    const parsedBandejas = parsedPeso !== null ? Math.max(1, Math.floor(parsedPeso)) : Math.max(1, Number(cantidad_bandejas) || 1);
    const parsedEfectivo = Number(monto_efectivo) || 0;
    const parsedTransferencia = Number(monto_transferencia) || 0;

    await query(
      'INSERT INTO ventas (id, fecha, cliente, cliente_id, producto_id, peso_kg, cantidad_bandejas, precio_por_kg, medio_pago, monto_efectivo, monto_transferencia, estado, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, fecha, resolvedClienteNombre, resolvedClienteId, producto_id, parsedPeso, parsedBandejas, precioKg, medio_pago, parsedEfectivo, parsedTransferencia, estado, notas]
    );

    const createdRows = await query<any[]>('SELECT * FROM ventas WHERE id = ?', [id]);

    return NextResponse.json({ success: true, venta: createdRows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { id, fecha, cliente, cliente_id, producto_id, peso_kg, cantidad_bandejas, precio_por_kg, medio_pago, monto_efectivo = 0, monto_transferencia = 0, estado, notas } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const { id: resolvedClienteId, nombre: resolvedClienteNombre } = await resolveClientId(cliente, cliente_id);

    const parsedPeso = peso_kg !== null && peso_kg !== '' && !isNaN(Number(peso_kg)) ? Number(peso_kg) : null;
    const parsedBandejas = parsedPeso !== null ? Math.max(1, Math.floor(parsedPeso)) : Math.max(1, Number(cantidad_bandejas) || 1);
    const parsedEfectivo = Number(monto_efectivo) || 0;
    const parsedTransferencia = Number(monto_transferencia) || 0;

    await query(
      `UPDATE ventas
       SET fecha = ?, cliente = ?, cliente_id = ?, producto_id = ?, peso_kg = ?, cantidad_bandejas = ?, precio_por_kg = ?, medio_pago = ?, monto_efectivo = ?, monto_transferencia = ?, estado = ?, notas = ?
       WHERE id = ?`,
      [fecha, resolvedClienteNombre, resolvedClienteId, producto_id, parsedPeso, parsedBandejas, precio_por_kg, medio_pago, parsedEfectivo, parsedTransferencia, estado, notas, id]
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
