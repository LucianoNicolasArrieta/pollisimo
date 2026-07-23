import { Pool as NeonPool } from '@neondatabase/serverless';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let neonPool: NeonPool | null = null;
let mysqlPool: mysql.Pool | null = null;

if (databaseUrl) {
  neonPool = new NeonPool({ connectionString: databaseUrl });
} else {
  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '1234',
    database: process.env.MYSQL_DATABASE || 'pollisimo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
}

export async function query<T = any>(sqlStr: string, params: any[] = []): Promise<T> {
  if (neonPool) {
    // Convert ? placeholders to $1, $2, $3 for PostgreSQL
    let paramIndex = 1;
    const pgSqlStr = sqlStr.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await neonPool.query(pgSqlStr, params);
    return res.rows as unknown as T;
  } else if (mysqlPool) {
    const [rows] = await mysqlPool.execute(sqlStr, params);
    return rows as T;
  } else {
    throw new Error('No database connection pool initialized.');
  }
}

export default query;
