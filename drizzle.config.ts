import { defineConfig } from "drizzle-kit";
import "dotenv/config";
import { getDrizzleDatabaseCredentials } from "./server/databaseTls.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: getDrizzleDatabaseCredentials(),
});
