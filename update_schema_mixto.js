const { neon } = require('@neondatabase/serverless');
const mysql = require('mysql2/promise');

const neonUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sqlNeon = neon(neonUrl);

async function run() {
  console.log('1. Updating Neon PostgreSQL DB schema for Mixed Payments and Initial Production Stock...');
  
  try {
    // Add columns to ventas if not exist
    await sqlNeon`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_efectivo NUMERIC(10, 2) DEFAULT 0.00;`;
    await sqlNeon`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_transferencia NUMERIC(10, 2) DEFAULT 0.00;`;
    
    // Add columns to productos for initial stock of finished milanesas
    await sqlNeon`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_inicial_kilos NUMERIC(10, 3) DEFAULT 0.000;`;
    await sqlNeon`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_inicial_bandejas INT DEFAULT 0;`;

    // Recreate v_resumen_produccion to include stock_inicial
    await sqlNeon`
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

    console.log('✓ Neon DB schema updated successfully!');
  } catch (err) {
    console.error('Error updating Neon DB:', err);
  }

  console.log('2. Updating MySQL local DB schema...');
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '1234',
      database: 'pollisimo'
    });

    // Check & add columns in MySQL
    try {
      await connection.query('ALTER TABLE ventas ADD COLUMN monto_efectivo DECIMAL(10, 2) DEFAULT 0.00;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE ventas ADD COLUMN monto_transferencia DECIMAL(10, 2) DEFAULT 0.00;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE ventas MODIFY COLUMN medio_pago ENUM("Efectivo", "Transferencia", "Mixto") DEFAULT "Efectivo";');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE productos ADD COLUMN stock_inicial_kilos DECIMAL(10, 3) DEFAULT 0.000;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE productos ADD COLUMN stock_inicial_bandejas INT DEFAULT 0;');
    } catch (e) {}

    await connection.query(`
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
    `);

    await connection.end();
    console.log('✓ MySQL local schema updated successfully!');
  } catch (err) {
    console.error('Error updating MySQL DB:', err);
  }
}

run();
