const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function run() {
  try {
    console.log('Connecting to Neon DB via HTTPS...');
    
    // 1. Wipe all tables
    console.log('Wiping existing data for clean reset...');
    await sql`TRUNCATE TABLE produccion_insumos CASCADE;`;
    await sql`TRUNCATE TABLE producciones CASCADE;`;
    await sql`TRUNCATE TABLE ventas CASCADE;`;
    await sql`TRUNCATE TABLE compras CASCADE;`;
    await sql`TRUNCATE TABLE insumos CASCADE;`;
    await sql`TRUNCATE TABLE productos CASCADE;`;

    // 2. Insert Real Catalog Product
    console.log('Inserting product (Milanesa de pollo @ $9.500 / kg)...');
    await sql`
      INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg)
      VALUES ('prod-1', 'Milanesa de pollo', 'kg', 9500.00, 6041.77);
    `;

    // 3. Insert Insumos Catalog (with clean initial stock = 0 for fresh user entry)
    console.log('Inserting insumos catalog...');
    const insumosData = [
      ['ins-1', 'Pechuga de pollo', 'kg', 0.0, 5.0, 3800.0],
      ['ins-2', 'Pan rallado', 'kg', 0.0, 3.0, 1200.0],
      ['ins-3', 'Huevo', 'unidad', 0.0, 10.0, 180.0],
      ['ins-4', 'Sal', 'Gr', 0.0, 50.0, 2.0],
      ['ins-5', 'Provenzal', 'Gr', 0.0, 50.0, 8.0],
      ['ins-6', 'Pimenton', 'Gr', 0.0, 50.0, 8.0],
      ['ins-7', 'Bandejas', 'Unidad', 0.0, 10.0, 95.0],
      ['ins-8', 'Arranque', 'Unidad', 0.0, 10.0, 45.0],
      ['ins-9', 'Folex', 'unidad', 0.0, 10.0, 30.0],
      ['ins-10', 'Cofias', 'unidad', 0.0, 5.0, 150.0],
      ['ins-11', 'Guantes', 'unidad', 0.0, 5.0, 120.0],
      ['ins-12', 'Camiseta', 'unidad', 0.0, 10.0, 50.0]
    ];

    for (const item of insumosData) {
      await sql`
        INSERT INTO insumos (id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario) 
        VALUES (${item[0]}, ${item[1]}, ${item[2]}, ${item[3]}, ${item[4]}, ${item[5]});
      `;
    }

    // 4. Insert 28 REAL Sales from Excel Pollisimo_Control_de_Gestion_4.xlsx
    console.log('Populating exact 28 real sales from Excel...');
    const realVentas = [
      ['vta-1', '2026-07-14', 'Estefania Arregui', 'prod-1', 2.230, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-2', '2026-07-14', 'Irma', 'prod-1', 2.136, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-3', '2026-07-14', 'Sofi Magallanes', 'prod-1', 1.115, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-4', '2026-07-14', 'Emi Pereyra', 'prod-1', 1.070, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-5', '2026-07-14', 'Agus Chacon', 'prod-1', 1.050, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-6', '2026-07-14', 'Berni', 'prod-1', 1.105, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-7', '2026-07-14', 'Andre', 'prod-1', 1.105, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-8', '2026-07-14', 'Cami Harguyntegui', 'prod-1', 3.117, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-9', '2026-07-14', 'Mari Murue', 'prod-1', 2.030, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-10', '2026-07-14', 'Cata Domato', 'prod-1', 1.084, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-11', '2026-07-14', 'Dasil', 'prod-1', 1.050, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-12', '2026-07-14', 'Ariel Izquierdo', 'prod-1', 1.000, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-13', '2026-07-14', 'Carolina Heger', 'prod-1', 1.000, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-14', '2026-07-15', 'Loli Herrera', 'prod-1', 2.215, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-15', '2026-07-16', 'Lili Loker', 'prod-1', null, 9500.00, 'Transferencia', 'Reservado', 'Reserva sin peso'],
      ['vta-16', '2026-07-16', 'Fran Isnaldi', 'prod-1', 1.084, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-17', '2026-07-16', 'Euge Castelli', 'prod-1', 2.263, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-18', '2026-07-16', 'Zul', 'prod-1', 2.189, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-19', '2026-07-16', 'Claudia Biolay', 'prod-1', null, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-20', '2026-07-16', 'Maria Elva Martinez', 'prod-1', 1.230, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-21', '2026-07-18', 'Jose', 'prod-1', 4.431, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-22', '2026-07-18', 'Ana Calligo', 'prod-1', 2.105, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-23', '2026-07-18', 'Mari Murue', 'prod-1', 2.200, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-24', '2026-07-18', 'Georgi', 'prod-1', 1.210, 9500.00, 'Efectivo', 'Entregado', ''],
      ['vta-25', '2026-07-18', 'Marce Gonzalez', 'prod-1', 2.263, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-26', '2026-07-18', 'Augusto', 'prod-1', 2.168, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-27', '2026-07-18', 'Pedro Albornoz', 'prod-1', 1.315, 9500.00, 'Transferencia', 'Entregado', ''],
      ['vta-28', '2026-07-18', 'Pedro Albornoz', 'prod-1', 2.294, 9500.00, 'Transferencia', 'Entregado', '']
    ];

    for (const v of realVentas) {
      await sql`
        INSERT INTO ventas (id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas)
        VALUES (${v[0]}, ${v[1]}, ${v[2]}, ${v[3]}, ${v[4]}, ${v[5]}, ${v[6]}, ${v[7]}, ${v[8]});
      `;
    }

    console.log('🎉 Reset completed! Only the 28 exact real sales from the Excel are now present on Neon DB!');
  } catch (e) {
    console.error('Error during reset:', e);
  }
}

run();
