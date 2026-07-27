const { neon } = require('@neondatabase/serverless');
const mysql = require('mysql2/promise');

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

function toCleanDate(val) {
  if (!val) return '2026-07-27';
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '2026-07-27';
}

async function run() {
  console.log('--- REVISANDO Y REPARANDO FECHAS EN BASE DE DATOS ---');

  // 1. Neon DB
  try {
    const sqlNeon = neon(databaseUrl);
    const rows = await sqlNeon`SELECT id, fecha FROM ventas`;
    console.log(`Neon ventas encontradas: ${rows.length}`);
    for (const r of rows) {
      const clean = toCleanDate(r.fecha);
      if (String(r.fecha) !== clean) {
        console.log(`Corrigiendo venta Neon ID ${r.id}: "${r.fecha}" -> "${clean}"`);
        await sqlNeon`UPDATE ventas SET fecha = ${clean} WHERE id = ${r.id}`;
      }
    }
    console.log('✓ Neon DB fechas verificadas.');
  } catch (err) {
    console.error('Error Neon:', err.message);
  }

  // 2. MySQL Local
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '1234',
      database: process.env.MYSQL_DATABASE || 'pollisimo',
      dateStrings: true
    });
    const [rows] = await connection.query('SELECT id, fecha FROM ventas');
    console.log(`MySQL local ventas encontradas: ${rows.length}`);
    for (const r of rows) {
      const clean = toCleanDate(r.fecha);
      if (String(r.fecha) !== clean) {
        console.log(`Corrigiendo venta MySQL ID ${r.id}: "${r.fecha}" -> "${clean}"`);
        await connection.query('UPDATE ventas SET fecha = ? WHERE id = ?', [clean, r.id]);
      }
    }
    await connection.end();
    console.log('✓ MySQL local fechas verificadas.');
  } catch (err) {
    console.error('Error MySQL:', err.message);
  }
}

run();
