const { neon } = require('@neondatabase/serverless');
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

const neonUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ESb8d4OyvARu@ep-wild-forest-ac5p3779-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sqlNeon = neon(neonUrl);

async function run() {
  console.log('1. Migrating & Normalizing Clientes on Neon PostgreSQL...');
  try {
    await sqlNeon`
      CREATE TABLE IF NOT EXISTS clientes (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion VARCHAR(255),
        telefono VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sqlNeon`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(36) REFERENCES clientes(id) ON DELETE SET NULL;`;

    // Fetch existing unique client names from ventas
    const sales = await sqlNeon`SELECT id, cliente, cliente_id FROM ventas`;
    console.log(`Found ${sales.length} total sales in Neon DB.`);

    // Existing clients
    const existingClients = await sqlNeon`SELECT id, nombre FROM clientes`;
    const clientMap = new Map(); // normalized_name -> id

    existingClients.forEach((c) => {
      clientMap.set(c.nombre.trim().toLowerCase(), c.id);
    });

    for (const sale of sales) {
      if (!sale.cliente) continue;
      const rawName = sale.cliente.trim();
      const normKey = rawName.toLowerCase();

      let clientId = clientMap.get(normKey);

      if (!clientId) {
        // Create client
        clientId = randomUUID();
        await sqlNeon`INSERT INTO clientes (id, nombre) VALUES (${clientId}, ${rawName})`;
        clientMap.set(normKey, clientId);
        console.log(`+ Created client: "${rawName}" (${clientId})`);
      }

      // Associate sale with client_id if not set
      if (sale.cliente_id !== clientId) {
        await sqlNeon`UPDATE ventas SET cliente_id = ${clientId} WHERE id = ${sale.id}`;
      }
    }

    console.log('✓ Neon DB Clientes migration complete!');
  } catch (err) {
    console.error('Error migrating Neon DB:', err);
  }

  console.log('2. Migrating & Normalizing Clientes on MySQL local...');
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '1234',
      database: 'pollisimo'
    });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion VARCHAR(255),
        telefono VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    try {
      await connection.query('ALTER TABLE ventas ADD COLUMN cliente_id VARCHAR(36);');
    } catch (e) {}

    const [sales] = await connection.query('SELECT id, cliente, cliente_id FROM ventas');
    const [existingClients] = await connection.query('SELECT id, nombre FROM clientes');

    const clientMap = new Map();
    existingClients.forEach((c) => {
      clientMap.set(c.nombre.trim().toLowerCase(), c.id);
    });

    for (const sale of sales) {
      if (!sale.cliente) continue;
      const rawName = sale.cliente.trim();
      const normKey = rawName.toLowerCase();

      let clientId = clientMap.get(normKey);

      if (!clientId) {
        clientId = randomUUID();
        await connection.query('INSERT INTO clientes (id, nombre) VALUES (?, ?)', [clientId, rawName]);
        clientMap.set(normKey, clientId);
      }

      if (sale.cliente_id !== clientId) {
        await connection.query('UPDATE ventas SET cliente_id = ? WHERE id = ?', [clientId, sale.id]);
      }
    }

    await connection.end();
    console.log('✓ Local MySQL Clientes migration complete!');
  } catch (err) {
    console.error('Error migrating MySQL DB:', err);
  }
}

run();
