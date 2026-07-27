const { neon } = require('@neondatabase/serverless');
const mysql = require('mysql2/promise');

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
  console.log('Actualizando valores de cantidad_bandejas en la base de datos...');
  
  // 1. Neon PostgreSQL
  try {
    const sqlNeon = neon(databaseUrl);
    await sqlNeon`
      UPDATE ventas 
      SET cantidad_bandejas = CASE 
        WHEN peso_kg IS NOT NULL THEN GREATEST(1, FLOOR(peso_kg)::INT) 
        ELSE COALESCE(cantidad_bandejas, 1) 
      END
    `;
    console.log('✓ Neon DB actualizado correctamente.');
  } catch (err) {
    console.error('Error al actualizar Neon DB:', err.message);
  }

  // 2. MySQL Local
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '1234',
      database: process.env.MYSQL_DATABASE || 'pollisimo'
    });

    try {
      await connection.query('ALTER TABLE ventas ADD COLUMN cantidad_bandejas INT DEFAULT 1;');
    } catch (e) {}

    await connection.query(`
      UPDATE ventas 
      SET cantidad_bandejas = CASE 
        WHEN peso_kg IS NOT NULL THEN GREATEST(1, FLOOR(peso_kg)) 
        ELSE COALESCE(cantidad_bandejas, 1) 
      END
    `);
    await connection.end();
    console.log('✓ MySQL local actualizado correctamente.');
  } catch (err) {
    console.error('Error al actualizar MySQL local:', err.message);
  }
}

run();
