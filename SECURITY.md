# Security Notes

This document describes the active application path in this repository: React/Vite → Express/Node.js → Drizzle ORM → PostgreSQL. The old Supabase client, Edge Functions, and migrations have been removed. Historical discovery and architecture documents may still mention Supabase when describing earlier implementations.

## Active security boundaries

- Authentication and sessions are implemented in `server/auth.ts` and the Express routes. Passwords are hashed with bcryptjs; session records are stored in PostgreSQL.
- API handlers must authenticate requests and scope user-owned records to the authenticated user. The PostgreSQL schema currently has no foreign keys or row-level security policies; those controls must not be assumed to exist.
- Drizzle parameterizes database queries. Validate request bodies before using them and avoid returning raw database/provider errors to clients.
- `OPENAI_API_KEY` is server-side configuration for the Express AI and text-to-speech routes. Do not put it in a `VITE_` variable or commit real credentials.
- Configure HTTPS in production. Session cookies are marked secure when `NODE_ENV=production`.

## Production review still required

Before exposing the service publicly, verify CORS is restricted to intended origins, CSRF protections are enforced for cookie-authenticated requests, session tokens are not unnecessarily exposed to browser storage, rate limiting works across instances, and error responses do not expose internal details. Confirm database backups, least-privilege credentials, TLS, and a safe migration process for the selected PostgreSQL host.

Run the security tests with `npm test -- tests/unit/server/security.test.ts`. Passing tests do not replace a production configuration review.

## Reporting a vulnerability

Do not open a public issue for an undisclosed vulnerability. Contact the project maintainer privately with the affected component and reproduction details.
