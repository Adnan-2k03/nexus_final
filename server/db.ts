import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure PostgreSQL connection with SSL
// Railway and most cloud PostgreSQL providers use shared certificates
// that require rejectUnauthorized: false for SSL connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('ssl=true')
    ? { rejectUnauthorized: false }
    : undefined
});

export { pool };
export const db = drizzle(pool, { schema });
