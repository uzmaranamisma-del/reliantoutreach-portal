import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDatabase = globalThis as unknown as {
  reliantSql?: ReturnType<typeof postgres>;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is not configured for the portal database.');

  const sql =
    globalForDatabase.reliantSql ??
    postgres(connectionString, {
      max: process.env.NODE_ENV === 'production' ? 10 : 2,
      prepare: false,
      ssl: connectionString.includes('localhost') ? false : 'require',
    });
  if (process.env.NODE_ENV !== 'production') globalForDatabase.reliantSql = sql;
  return drizzle(sql, { schema });
}
