import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, clearCsrfToken, clearLegacyAuthToken, setCsrfToken } from "./api";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

describe("API CSRF headers", () => {
  afterEach(() => {
    clearCsrfToken();
    vi.unstubAllGlobals();
  });

  it("uses the session cookie and sends the stored CSRF token with authenticated mutations", async () => {
    setCsrfToken("valid-csrf-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "item-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("POST", "/api/pantry-items", { name: "Milk" });

    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.get("X-CSRF-Token")).toBe("valid-csrf-token");
    expect(options.credentials).toBe("include");
  });

  it("removes a legacy bearer token from localStorage", () => {
    localStorage.setItem("sage_auth_token", "obsolete-session-token");
    clearLegacyAuthToken();
    expect(localStorage.getItem("sage_auth_token")).toBeNull();
  });

  it("fetches a CSRF token before a mutation when none is stored", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "fresh-csrf-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "item-2" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("POST", "/api/pantry-items", { name: "Eggs" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf-token");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
    const headers = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(headers.get("X-CSRF-Token")).toBe("fresh-csrf-token");
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
  });

  it("does not require a CSRF token for safe or pre-authentication requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "user-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("GET", "/api/pantry-items");
    await apiRequest("POST", "/api/auth/signin", { email: "user@example.test", password: "Test1234" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options.headers).has("X-CSRF-Token")).toBe(false);
    }
  });

  it("refreshes an expired token and retries only a CSRF-rejected mutation", async () => {
    setCsrfToken("expired-csrf-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ code: "CSRF_INVALID" }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "refreshed-csrf-token" }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest("DELETE", "/api/pantry-items/item-1");

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/csrf-token");
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get("X-CSRF-Token")).toBe("refreshed-csrf-token");
  });
});
