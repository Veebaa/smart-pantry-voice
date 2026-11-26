import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import type { ConnectionOptions } from "node:tls";

export type VerifiedPostgresSslOptions = Pick<ConnectionOptions, "ca" | "rejectUnauthorized">;
export type ReadCaFile = (path: string) => string;

const readCaFile: ReadCaFile = (path) => readFileSync(path, "utf8");

export function getPostgresSslOptions(
  env: NodeJS.ProcessEnv = process.env,
  readCa: ReadCaFile = readCaFile,
): false | VerifiedPostgresSslOptions {
  if (env.NODE_ENV !== "production") return false;

  const caPath = env.DATABASE_CA_CERT_PATH?.trim();
  if (!caPath) {
    throw new Error("DATABASE_CA_CERT_PATH is required for production PostgreSQL TLS verification.");
  }

  let ca: string;
  try {
    ca = readCa(caPath);
  } catch {
    throw new Error("The PostgreSQL CA certificate could not be read from DATABASE_CA_CERT_PATH.");
  }
  if (!ca.trim()) {
    throw new Error("The PostgreSQL CA certificate at DATABASE_CA_CERT_PATH is empty.");
  }

  return { ca, rejectUnauthorized: true };
}

function parseDatabaseUrl(databaseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }
  if (!url.hostname || !url.pathname || url.pathname === "/") {
    throw new Error("DATABASE_URL must include a PostgreSQL hostname and database name.");
  }
  return url;
}

function assertDnsHostnameForProduction(url: URL, env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== "production") return;
  const hosts = url.hostname.split(",").map((host) =>
    host.startsWith("[") && host.endsWith("]")
      ? host.slice(1, -1)
      : host.replace(/:\d+$/, "")
  );
  if (hosts.some((host) => isIP(host) !== 0)) {
    throw new Error("Production DATABASE_URL must use DNS hostnames for PostgreSQL certificate hostname verification.");
  }
}

export function getDrizzleDatabaseCredentials(
  env: NodeJS.ProcessEnv = process.env,
  readCa: ReadCaFile = readCaFile,
) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set for Drizzle Kit.");

  const url = parseDatabaseUrl(databaseUrl);
  assertDnsHostnameForProduction(url, env);

  let user: string | undefined;
  let password: string | undefined;
  try {
    user = url.username ? decodeURIComponent(url.username) : undefined;
    password = url.password ? decodeURIComponent(url.password) : undefined;
  } catch {
    throw new Error("DATABASE_URL contains invalid encoded credentials.");
  }

  let database: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error("DATABASE_URL contains an invalid encoded database name.");
  }

  return {
    host: url.hostname,
    ...(url.port ? { port: Number(url.port) } : {}),
    ...(user ? { user } : {}),
    ...(password ? { password } : {}),
    database,
    ssl: getPostgresSslOptions(env, readCa),
  };
}

export function validateRuntimeDatabaseUrl(databaseUrl: string, env: NodeJS.ProcessEnv = process.env) {
  const url = parseDatabaseUrl(databaseUrl);
  assertDnsHostnameForProduction(url, env);
}

export function assertProductionDatabaseTlsConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  readCa: ReadCaFile = readCaFile,
) {
  if (env.NODE_ENV !== "production") return;
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be set in production.");
  validateRuntimeDatabaseUrl(env.DATABASE_URL, env);
  getPostgresSslOptions(env, readCa);
}
