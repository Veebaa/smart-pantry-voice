import { describe, expect, it, vi } from "vitest";
import {
  assertProductionDatabaseTlsConfiguration,
  getDrizzleDatabaseCredentials,
  getPostgresSslOptions,
  validateRuntimeDatabaseUrl,
} from "../../../server/databaseTls.js";

const caPath = "/mounted/secret/postgres-ca.pem";
const caContents = "-----BEGIN CERTIFICATE-----\nexample-ca\n-----END CERTIFICATE-----";
const readCa = vi.fn(() => caContents);

describe("PostgreSQL TLS configuration", () => {
  it("keeps development connections non-TLS without requiring a CA file", () => {
    expect(getPostgresSslOptions({ NODE_ENV: "development" })).toBe(false);
    expect(getDrizzleDatabaseCredentials({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://dev:local@localhost:5432/sage",
    })).toMatchObject({ host: "localhost", database: "sage", ssl: false });
  });

  it("requires a CA certificate for production and does not include paths in errors", () => {
    expect(() => getPostgresSslOptions({ NODE_ENV: "production" })).toThrow(/DATABASE_CA_CERT_PATH is required/);
    expect(() => getPostgresSslOptions({
      NODE_ENV: "production",
      DATABASE_CA_CERT_PATH: caPath,
    }, () => { throw new Error("sensitive path detail"); })).toThrow(/could not be read/);
    expect(() => getPostgresSslOptions({
      NODE_ENV: "production",
      DATABASE_CA_CERT_PATH: caPath,
    }, () => "  ")).toThrow(/is empty/);
    expect(() => assertProductionDatabaseTlsConfiguration({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:password@db.example.test/sage",
    })).toThrow(/DATABASE_CA_CERT_PATH is required/);
  });

  it("does not require production TLS settings outside production", () => {
    expect(() => assertProductionDatabaseTlsConfiguration({
      NODE_ENV: "development",
    })).not.toThrow();
    expect(() => assertProductionDatabaseTlsConfiguration({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:password@db.example.test/sage",
      DATABASE_CA_CERT_PATH: caPath,
    }, readCa)).not.toThrow();
  });

  it("returns strict CA and hostname-verifying TLS options for runtime and migrations", () => {
    const env = {
      NODE_ENV: "production",
      DATABASE_CA_CERT_PATH: caPath,
      DATABASE_URL: "postgresql://sage_user:p%40ss%3Aword@db.example.test:5432/sage?sslmode=require",
    } as NodeJS.ProcessEnv;

    expect(getPostgresSslOptions(env, readCa)).toEqual({ ca: caContents, rejectUnauthorized: true });
    expect(getDrizzleDatabaseCredentials(env, readCa)).toEqual({
      host: "db.example.test",
      port: 5432,
      user: "sage_user",
      password: "p@ss:word",
      database: "sage",
      ssl: { ca: caContents, rejectUnauthorized: true },
    });
    expect(readCa).toHaveBeenCalledWith(caPath);
  });

  it("rejects IP database hosts in production because hostname verification needs DNS", () => {
    const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(() => validateRuntimeDatabaseUrl("postgres://user:pass@127.0.0.1:5432/sage", env)).toThrow(/DNS hostnames/);
    expect(() => getDrizzleDatabaseCredentials({
      ...env,
      DATABASE_URL: "postgres://user:pass@[::1]:5432/sage",
    }, readCa)).toThrow(/DNS hostnames/);
  });

  it("reports malformed or absent database URLs without echoing credentials", () => {
    expect(() => getDrizzleDatabaseCredentials({ NODE_ENV: "production" })).toThrow(/DATABASE_URL must be set/);
    expect(() => validateRuntimeDatabaseUrl("not-a-url?password=secret")).toThrow(/valid PostgreSQL connection URL/);
  });
});
