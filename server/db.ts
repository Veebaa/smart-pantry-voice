import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from "../shared/schema.js";

let queryClient: Sql | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

export async function initializeDb(): Promise<void> {
  if (dbInstance) return;
  
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be set. Please configure the database in deployment secrets.");
    }

    console.log(`[db] Connecting to database (production: ${isProduction})...`);

    queryClient = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: isProduction ? 'require' : false,
      onnotice: () => {},
    });

    dbInstance = drizzle(queryClient, { schema });
    console.log("[db] Database connection initialized");
  })();

  await initPromise;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbInstance) {
    throw new Error("Database not initialized. Ensure initializeDb() was called.");
  }
  return dbInstance;
}

export function isDbInitialized(): boolean {
  return dbInstance !== null;
}
