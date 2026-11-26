import type { CorsOptions } from "cors";

function parseOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((value) => value.trim()).filter(Boolean).filter((origin) => {
    if (origin === "*") return false;
    try {
      const parsed = new URL(origin);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        parsed.origin === origin && parsed.username === "" && parsed.password === "";
    } catch {
      return false;
    }
  }));
}

export function isAllowedOrigin(
  origin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // Requests without Origin are same-origin, command-line, or server-to-server requests.
  if (!origin) return true;
  if (origin === "*") return false;
  if (parseOrigins(env.CORS_ALLOWED_ORIGINS).has(origin)) return true;

  if (env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    } catch {
      return false;
    }
  }
  return false;
}

export function createCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  return {
    origin(origin, callback) {
      // Return the validated origin explicitly; `true` would make cors emit `*`
      // for requests without an Origin header, alongside credentials.
      callback(null, origin && isAllowedOrigin(origin, env) ? origin : false);
    },
    credentials: true,
  };
}
