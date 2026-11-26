import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireCsrfToken } from "../../../server/auth.js";
import { createCsrfToken } from "../../../server/security.js";

function runCsrfMiddleware(method: string, sessionId?: string, token?: string) {
  const req = {
    method,
    sessionId,
    get: vi.fn((header: string) => header === "X-CSRF-Token" ? token : undefined),
  } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as NextFunction;

  requireCsrfToken(req, res, next);
  return { status, json, next };
}

describe("authenticated CSRF protection", () => {
  it("rejects a state-changing request without a CSRF token", () => {
    const { status, json, next } = runCsrfMiddleware("POST", "session-1");

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: "Invalid or missing CSRF token",
      code: "CSRF_INVALID",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a state-changing request with the token for its session", () => {
    const token = createCsrfToken("session-2");
    const { status, json, next } = runCsrfMiddleware("PATCH", "session-2", token);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects a valid token belonging to a different session", () => {
    const token = createCsrfToken("session-3");
    const { status, next } = runCsrfMiddleware("DELETE", "session-4", token);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["GET", "HEAD", "OPTIONS"])("allows safe %s requests without a token", (method) => {
    const { status, next } = runCsrfMiddleware(method, "session-5");

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });
});
