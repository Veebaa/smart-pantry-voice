import { describe, expect, it } from "vitest";
import cors from "cors";
import { createCorsOptions, isAllowedOrigin } from "../../../server/cors.js";

function invokeCors(options: ReturnType<typeof createCorsOptions>, method: string, headers: Record<string, string> = {}) {
  const responseHeaders = new Map<string, string>();
  const response: any = {
    statusCode: 200,
    setHeader: (name: string, value: string) => responseHeaders.set(name.toLowerCase(), value),
    getHeader: (name: string) => responseHeaders.get(name.toLowerCase()),
    end: () => {},
  };
  let continued = false;
  const middleware = cors(options);
  middleware({ method, headers }, response, () => { continued = true; });
  return { headers: responseHeaders, status: response.statusCode, continued };
}

describe("credentialed CORS origin policy", () => {
  it("allows only exact configured production origins", () => {
    const env = {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://app.example.test, https://admin.example.test",
    } as NodeJS.ProcessEnv;

    expect(isAllowedOrigin("https://app.example.test", env)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", env)).toBe(false);
    expect(isAllowedOrigin("https://app.example.test.evil", env)).toBe(false);
    expect(isAllowedOrigin(undefined, env)).toBe(true);
  });

  it("allows localhost origins during development and configured origins", () => {
    const env = { NODE_ENV: "development", CORS_ALLOWED_ORIGINS: "https://preview.example.test" } as NodeJS.ProcessEnv;

    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5000", env)).toBe(true);
    expect(isAllowedOrigin("https://preview.example.test", env)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", env)).toBe(false);
  });

  it("does not allow localhost implicitly in production", () => {
    const env = { NODE_ENV: "production", CORS_ALLOWED_ORIGINS: "" } as NodeJS.ProcessEnv;
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(false);
  });

  it("never emits wildcard credentialed CORS headers and handles preflight", async () => {
    const env = {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://app.example.test, *",
    } as NodeJS.ProcessEnv;
    const preflight = invokeCors(createCorsOptions(env), "OPTIONS", {
      origin: "https://app.example.test",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type,x-csrf-token",
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.test");
    expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("x-csrf-token");

    const denied = invokeCors(createCorsOptions(env), "GET", { origin: "*" });
    expect(denied.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("keeps same-origin requests and credentialed authenticated requests usable", async () => {
    const options = createCorsOptions({ NODE_ENV: "production", CORS_ALLOWED_ORIGINS: "https://app.example.test" } as NodeJS.ProcessEnv);
    const sameOrigin = invokeCors(options, "GET", {});
    expect(sameOrigin.continued).toBe(true);
    expect(sameOrigin.headers.has("access-control-allow-origin")).toBe(false);

    const credentialed = invokeCors(options, "GET", { origin: "https://app.example.test" });
    expect(credentialed.continued).toBe(true);
    expect(credentialed.headers.get("access-control-allow-origin")).toBe("https://app.example.test");
    expect(credentialed.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
