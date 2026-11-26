# Security Notes

This document describes the active application path in this repository: React/Vite → Express/Node.js → Drizzle ORM → PostgreSQL. The old Supabase client, Edge Functions, and migrations have been removed. Historical discovery and architecture documents may still mention Supabase when describing earlier implementations.

## Active security boundaries

- Authentication and sessions are implemented in `server/auth.ts` and the Express routes. Passwords are hashed with bcryptjs; session records are stored in PostgreSQL.
- Browser authentication uses only the `HttpOnly` `session_token` cookie. Signup and signin set the cookie and return the user plus a session-bound CSRF token; they do not return the session token in JSON. The backend does not accept Bearer authentication.
- API handlers must authenticate requests and scope user-owned records to the authenticated user. The PostgreSQL schema currently has no foreign keys or row-level security policies; those controls must not be assumed to exist.
- Drizzle parameterizes database queries. Validate request bodies before using them and avoid returning raw database/provider errors to clients.
- `OPENAI_API_KEY` is server-side configuration for the Express AI and text-to-speech routes. Do not put it in a `VITE_` variable or commit real credentials.
- Configure HTTPS and PostgreSQL TLS in production. In production, both runtime and Drizzle migration connections require `DATABASE_CA_CERT_PATH` pointing to an externally mounted PEM CA certificate. They use postgres-js TLS options with that CA and `rejectUnauthorized: true`; production database URLs must use DNS hostnames so TLS verifies the hostname. Local/development connections continue without TLS and do not require the CA file. Never commit database URLs or CA certificates. Production TLS has not been tested against a real provider. Session cookies are marked secure when `NODE_ENV=production`.
- The `Permissions-Policy` allows microphone access only to the application's own origin for voice input (`microphone=(self)`); geolocation and camera are disabled (`=()`).
- Authenticated `POST`, `PATCH`, and `DELETE` requests require the session-bound `X-CSRF-Token` returned by signup/signin. The frontend refreshes it through `GET /api/auth/csrf-token` when missing or expired. Signup and signin are pre-authentication exceptions; safe methods do not require the token.
- The CSRF token is stored in `sessionStorage` and is not an authentication credential. The app removes the obsolete `sage_auth_token` localStorage key at startup so tokens left by older app versions are cleared.
- Credentialed CORS uses `CORS_ALLOWED_ORIGINS`, a comma-separated list of exact HTTP(S) origins (scheme and port included). Configure the actual browser origin(s) for a cross-origin production frontend; no production domain is assumed. Invalid entries and `*` are ignored. Requests without an `Origin` header remain usable for same-origin and server-to-server traffic and receive no CORS headers. Development additionally allows localhost and loopback origins for Vite. The CORS middleware handles preflight requests.
- API access logs contain method, path, status, and duration only. They do not serialize response bodies. Request bodies, session cookies, bearer tokens, CSRF tokens, passwords, email addresses, and provider response bodies are not logged. Security-event records retain event category and request IP, not caller-supplied detail text. Unexpected server errors return generic client messages; server diagnostics retain safe error categories, not exception messages or stack traces.

## Production review still required

Before exposing the service publicly, verify CORS is restricted to intended origins, CSRF token state is shared or requests are routed consistently across application instances, session cookies use HTTPS, rate limiting works across instances, and error responses do not expose internal details. Production database provisioning is not verified, and no production backup/restore, migration rollback, or post-migration verification procedure has been established. Define and rehearse database backups and restores, least-privilege credentials, CA provisioning/rotation, and a safe migration process against a disposable database before production use.

Run the security tests with `npm test -- tests/unit/server/security.test.ts`. Passing tests do not replace a production configuration review.

## Reporting a vulnerability

Do not open a public issue for an undisclosed vulnerability. Contact the project maintainer privately with the affected component and reproduction details.
