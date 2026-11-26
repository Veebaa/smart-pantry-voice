import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { UserProvider, useUser } from "./UserContext";

function UserStatus() {
  const { user, loading, login } = useUser();
  return (
    <div>
      <span>{loading ? "loading" : user?.email ?? "signed-out"}</span>
      <button onClick={() => void login("person@example.test", "Password123")}>login</button>
    </div>
  );
}

describe("cookie-based user context", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("checks the existing session with cookies and clears obsolete localStorage auth", async () => {
    localStorage.setItem("sage_auth_token", "legacy-session-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: "u1", email: "person@example.test" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<UserProvider><UserStatus /></UserProvider>);

    expect(await screen.findByText("person@example.test")).toBeTruthy();
    expect(localStorage.getItem("sage_auth_token")).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/user");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("keeps only the CSRF token after login", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        user: { id: "u1", email: "person@example.test" },
        csrfToken: "session-bound-csrf",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<UserProvider><UserStatus /></UserProvider>);
    await screen.findByText("signed-out");
    screen.getByText("login").click();

    expect(await screen.findByText("person@example.test")).toBeTruthy();
    await waitFor(() => expect(sessionStorage.getItem("sage_csrf_token")).toBe("session-bound-csrf"));
    expect(localStorage.getItem("sage_auth_token")).toBeNull();
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).has("Authorization")).toBe(false);
  });
});
