import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema.js";

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

if (!databaseUrl) {
  console.error("[db] DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL must be set. Please configure the database in deployment secrets.");
}

console.log(`[db] Connecting to database (production: ${isProduction})...`);

const queryClient = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isProduction ? 'require' : false,
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(queryClient, { schema });
console.log("[db] Database connection initialized");
