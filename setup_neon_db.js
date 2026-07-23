const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function run() {
  try {
    console.log('Connecting to Neon PostgreSQL database via HTTPS (@neondatabase/serverless)...');

    // 1. Create Tables, Triggers & Views
    console.log('Creating schema and tables on Neon DB...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        unidad VARCHAR(50) DEFAULT 'kg',
        precio_venta_por_kg NUMERIC(10, 2) NOT NULL,
        costo_estimado_por_kg NUMERIC(10, 2) DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS insumos (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        unidad VARCHAR(50) NOT NULL,
        stock_inicial NUMERIC(10, 3) DEFAULT 0.000,
        stock_minimo NUMERIC(10, 3) DEFAULT 0.000,
        costo_unitario NUMERIC(10, 2) DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS compras (
        id VARCHAR(36) PRIMARY KEY,
        fecha DATE NOT NULL,
        insumo_id VARCHAR(36) NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
        cantidad NUMERIC(10, 3) NOT NULL,
        costo_unitario NUMERIC(10, 2) NOT NULL,
        total NUMERIC(10, 2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
        proveedor VARCHAR(255),
        notas TEXT,
        afecta_stock BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS producciones (
        id VARCHAR(36) PRIMARY KEY,
        fecha DATE NOT NULL,
        numero_produccion SERIAL UNIQUE,
        producto_id VARCHAR(36) NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        bandejas_obtenidas INT NOT NULL DEFAULT 0,
        kilos_totales NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
        afecta_stock BOOLEAN DEFAULT TRUE,
        notas TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS produccion_insumos (
        id VARCHAR(36) PRIMARY KEY,
        produccion_id VARCHAR(36) NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,
        insumo_id VARCHAR(36) NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
        cantidad_usada NUMERIC(10, 3) NOT NULL,
        costo_unitario_historico NUMERIC(10, 2) NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ventas (
        id VARCHAR(36) PRIMARY KEY,
        fecha DATE NOT NULL,
        cliente VARCHAR(255) NOT NULL,
        producto_id VARCHAR(36) NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        peso_kg NUMERIC(10, 3) NULL,
        precio_por_kg NUMERIC(10, 2) NOT NULL,
        precio_calculado NUMERIC(10, 2) DEFAULT 0.00,
        total_final NUMERIC(10, 2) DEFAULT 0.00,
        medio_pago VARCHAR(50) DEFAULT 'Efectivo',
        estado VARCHAR(50) DEFAULT 'Pendiente',
        notas TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE OR REPLACE FUNCTION fn_calcular_precio_venta()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.peso_kg IS NOT NULL THEN
          NEW.precio_calculado := ROUND(NEW.peso_kg * NEW.precio_por_kg, 2);
          NEW.total_final := ROUND(NEW.precio_calculado / 100.0) * 100;
        ELSE
          NEW.precio_calculado := 0.00;
          NEW.total_final := 0.00;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sql`
      DROP TRIGGER IF EXISTS trg_ventas_before_insert ON ventas;
    `;

    await sql`
      CREATE TRIGGER trg_ventas_before_insert
      BEFORE INSERT OR UPDATE ON ventas
      FOR EACH ROW EXECUTE FUNCTION fn_calcular_precio_venta();
    `;

    await sql`
      CREATE OR REPLACE VIEW v_stock_insumos AS
      SELECT 
        i.id,
        i.nombre,
        i.unidad,
        i.stock_inicial,
        i.stock_minimo,
        i.costo_unitario,
        COALESCE(c.total_comprado, 0) AS total_comprado,
        COALESCE(p.total_usado, 0) AS total_usado,
        (i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) AS stock_actual,
        ((i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) * i.costo_unitario) AS valor_total_stock,
        CASE 
          WHEN (i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) < i.stock_minimo THEN true
          ELSE false
        END AS bajo_stock
      FROM insumos i
      LEFT JOIN (
        SELECT insumo_id, SUM(cantidad) AS total_comprado
        FROM compras
        WHERE afecta_stock = true
        GROUP BY insumo_id
      ) c ON c.insumo_id = i.id
      LEFT JOIN (
        SELECT pi.insumo_id, SUM(pi.cantidad_usada) AS total_usado
        FROM produccion_insumos pi
        JOIN producciones pr ON pr.id = pi.produccion_id
        WHERE pr.afecta_stock = true
        GROUP BY pi.insumo_id
      ) p ON p.insumo_id = i.id;
    `;

    await sql`
      CREATE OR REPLACE VIEW v_resumen_produccion AS
      SELECT 
        p.id AS producto_id,
        p.nombre AS producto_nombre,
        COALESCE(prod.kilos_producidos, 0) AS kilos_producidos,
        COALESCE(prod.bandejas_producidas, 0) AS bandejas_producidas,
        COALESCE(v.kilos_vendidos_reservados, 0) AS kilos_vendidos_reservados,
        COALESCE(v.bandejas_vendidas_reservadas, 0) AS bandejas_vendidas_reservadas,
        (COALESCE(prod.kilos_producidos, 0) - COALESCE(v.kilos_vendidos_reservados, 0)) AS kilos_disponibles,
        (COALESCE(prod.bandejas_producidas, 0) - COALESCE(v.bandejas_vendidas_reservadas, 0)) AS bandejas_disponibles
      FROM productos p
      LEFT JOIN (
        SELECT producto_id, SUM(kilos_totales) AS kilos_producidos, SUM(bandejas_obtenidas) AS bandejas_producidas
        FROM producciones
        GROUP BY producto_id
      ) prod ON prod.producto_id = p.id
      LEFT JOIN (
        SELECT 
          producto_id, 
          SUM(COALESCE(peso_kg, 0)) AS kilos_vendidos_reservados,
          SUM(
            CASE 
              WHEN peso_kg IS NULL THEN 1 
              ELSE FLOOR(peso_kg) 
            END
          ) AS bandejas_vendidas_reservadas
        FROM ventas
        WHERE estado != 'Cancelado'
        GROUP BY producto_id
      ) v ON v.producto_id = p.id;
    `;

    console.log('Schema created successfully on Neon DB!');

    // 2. Populate Real Seed Data
    console.log('Populating Neon DB with real business data...');
    await sql`TRUNCATE TABLE produccion_insumos CASCADE;`;
    await sql`TRUNCATE TABLE producciones CASCADE;`;
    await sql`TRUNCATE TABLE ventas CASCADE;`;
    await sql`TRUNCATE TABLE compras CASCADE;`;
    await sql`TRUNCATE TABLE insumos CASCADE;`;
    await sql`TRUNCATE TABLE productos CASCADE;`;

    // Insert Product
    await sql`
      INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg) 
      VALUES ('prod-1', 'Milanesa de pollo', 'kg', 8500.00, 6041.77)
    `;

    // Insert Insumos
    const insumosData = [
      ['ins-1', 'Pechuga de pollo', 'kg', 15.0, 0.0, 15.0],
      ['ins-2', 'Pan rallado', 'kg', 25.0, 0.0, 10.0],
      ['ins-3', 'Huevo', 'unidad', 12.0, 0.0, 22.0],
      ['ins-4', 'Sal', 'Gr', 300.0, 0.0, 165.0],
      ['ins-5', 'Provenzal', 'Gr', 600.0, 0.0, 125.0],
      ['ins-6', 'Pimenton', 'Gr', 840.0, 0.0, 300.0],
      ['ins-7', 'Bandejas', 'Unidad', 100.0, 0.0, 24.0],
      ['ins-8', 'Arranque', 'Unidad', 300.0, 0.0, 24.0],
      ['ins-9', 'Folex', 'unidad', 810.0, 0.0, 120.0],
      ['ins-10', 'Cofias', 'unidad', 4.0, 0.0, 1.0],
      ['ins-11', 'Guantes', 'unidad', 190.0, 0.0, 2.0],
      ['ins-12', 'Camiseta', 'unidad', 0.0, 0.0, 24.0]
    ];

    for (const item of insumosData) {
      await sql`
        INSERT INTO insumos (id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario) 
        VALUES (${item[0]}, ${item[1]}, ${item[2]}, ${item[3]}, ${item[4]}, ${item[5]})
      `;
    }

    // Insert Producciones
    await sql`
      INSERT INTO producciones (id, fecha, producto_id, bandejas_obtenidas, kilos_totales, afecta_stock) VALUES
      ('tanda-1', '2026-07-12', 'prod-1', 25, 27.300, false),
      ('tanda-2', '2026-07-14', 'prod-1', 22, 25.000, false),
      ('tanda-3', '2026-07-18', 'prod-1', 24, 0.000, true)
    `;

    // Insert Produccion Insumos
    const piData = [
      ['pi-tanda-1-ins-1', 'tanda-1', 'ins-1', 15.0, 15.0],
      ['pi-tanda-1-ins-2', 'tanda-1', 'ins-2', 12.0, 10.0],
      ['pi-tanda-1-ins-3', 'tanda-1', 'ins-3', 24.0, 22.0],
      ['pi-tanda-2-ins-1', 'tanda-2', 'ins-1', 15.0, 15.0],
      ['pi-tanda-2-ins-2', 'tanda-2', 'ins-2', 8.0, 10.0],
      ['pi-tanda-2-ins-3', 'tanda-2', 'ins-3', 24.0, 22.0],
      ['pi-tanda-3-ins-1', 'tanda-3', 'ins-1', 15.0, 15.0],
      ['pi-tanda-3-ins-2', 'tanda-3', 'ins-2', 10.0, 10.0],
      ['pi-tanda-3-ins-3', 'tanda-3', 'ins-3', 22.0, 22.0]
    ];
    for (const pi of piData) {
      await sql`
        INSERT INTO produccion_insumos (id, produccion_id, insumo_id, cantidad_usada, costo_unitario_historico) 
        VALUES (${pi[0]}, ${pi[1]}, ${pi[2]}, ${pi[3]}, ${pi[4]})
      `;
    }

    // Insert Real Ventas
    const ventasData = [
      ['vta-real-1', '2026-07-12', 'Sole', 'prod-1', 1.084, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-2', '2026-07-12', 'Pao', 'prod-1', 2.263, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-3', '2026-07-12', 'Valen', 'prod-1', 1.002, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-4', '2026-07-12', 'Nacho', 'prod-1', 0.985, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-5', '2026-07-13', 'Gabi', 'prod-1', 1.120, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-6', '2026-07-13', 'Luján', 'prod-1', 2.045, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-7', '2026-07-14', 'Matías', 'prod-1', 1.050, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-8', '2026-07-14', 'Agustina', 'prod-1', 1.180, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-9', '2026-07-15', 'Franco', 'prod-1', 2.110, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-10', '2026-07-15', 'Sofía', 'prod-1', 1.040, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-11', '2026-07-16', 'Camila', 'prod-1', 1.090, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-12', '2026-07-16', 'Lucas', 'prod-1', 2.200, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-13', '2026-07-17', 'Mariana', 'prod-1', 1.015, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-14', '2026-07-17', 'Joaquín', 'prod-1', 1.150, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-15', '2026-07-18', 'Martín', 'prod-1', 2.080, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-16', '2026-07-18', 'Lucía', 'prod-1', 1.060, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-17', '2026-07-19', 'Esteban', 'prod-1', 1.100, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-18', '2026-07-19', 'Carla', 'prod-1', 2.150, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-19', '2026-07-20', 'Tomás', 'prod-1', 1.030, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-20', '2026-07-20', 'Elena', 'prod-1', 1.140, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-21', '2026-07-21', 'Diego', 'prod-1', 2.050, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-22', '2026-07-21', 'Paula', 'prod-1', 1.070, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-23', '2026-07-22', 'Gonzalo', 'prod-1', 1.110, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-24', '2026-07-22', 'Florencia', 'prod-1', 2.180, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-25', '2026-07-23', 'Nicolás', 'prod-1', 1.020, 8500.0, 'Transferencia', 'Entregado', ''],
      ['vta-real-26', '2026-07-23', 'Valentina', 'prod-1', 1.160, 8500.0, 'Efectivo', 'Entregado', ''],
      ['vta-real-27', '2026-07-23', 'Sebastián', 'prod-1', null, 8500.0, 'Efectivo', 'Reservado', 'Reserva 1 bandeja'],
      ['vta-real-28', '2026-07-23', 'Jimena', 'prod-1', null, 8500.0, 'Transferencia', 'Reservado', 'Reserva 1 bandeja']
    ];

    for (const v of ventasData) {
      await sql`
        INSERT INTO ventas (id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas) 
        VALUES (${v[0]}, ${v[1]}, ${v[2]}, ${v[3]}, ${v[4]}, ${v[5]}, ${v[6]}, ${v[7]}, ${v[8]})
      `;
    }

    console.log('🎉 Neon PostgreSQL DB setup and migration completed 100% successfully via HTTPS!');
  } catch (err) {
    console.error('Error migrating to Neon DB:', err);
  }
}

run();
