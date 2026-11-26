**Working Document**

This document is an engineering discovery report created during the Sage 2.0 migration.

It records the current implementation to support architectural refactoring.

It is not part of the permanent architecture documentation and may be deleted once the relevant migration work is complete.

---

# Authentication & Users Capability Discovery

**Date:** August 2, 2026

**Purpose:** Discover authentication and user management business logic in the current implementation.

---

## Capability Overview

The Authentication and Users capabilities manage user registration, authentication, session management, and user-specific configuration.

**Authentication** handles:
- User registration (signup)
- User login (signin)
- Session management (token generation, validation, expiration)
- Session termination (signout)
- Protected endpoint authorization via middleware

**Users** handles:
- User account creation and storage
- User settings (preferences, household configuration)
- User profile retrieval
- User context propagation to other capabilities

---

## Business Responsibilities

### Authentication Responsibilities

1. **User Registration**
   - Accept email and password
   - Validate input (email format, password complexity)
   - Check email uniqueness (prevent duplicate registration)
   - Hash password with bcrypt (salt rounds: 10)
   - Create user record in database
   - Generate secure session token
   - Issue session cookie
   - Return CSRF token

2. **User Login**
   - Accept email and password
   - Validate input format
   - Look up user by email
   - Compare password with stored hash (timing-safe bcrypt)
   - Generate session token on success
   - Issue session cookie
   - Return CSRF token
   - Log failed attempts for security

3. **Session Management**
   - Generate cryptographically secure session tokens (32 random bytes, hex-encoded)
   - Store sessions with expiration (7 days)
   - Validate token on each protected request
   - Check session expiration
   - Load user from session token
   - Handle expired sessions (return 401)

4. **Session Termination**
   - Authenticate from the HttpOnly session cookie only; Bearer authentication is not supported
   - Delete session from database
   - Clear session cookie from browser
   - Return success response

5. **Rate Limiting**
   - Limit signup requests: 5 per 60 seconds per IP
   - Limit login requests: 10 per 15 minutes per IP
   - Return 429 with retry-after on rate limit exceeded
   - Prevent brute force attacks on auth endpoints

6. **Security Event Logging**
   - Log signup validation failures
   - Log duplicate email registration attempts
   - Log failed login attempts with email
   - Log validation errors
   - Include client IP and timestamp in logs

### Users Responsibilities

1. **User Account Storage**
   - Store user id (UUID)
   - Store user email (unique)
   - Store password hash
   - Store account creation timestamp

2. **User Settings Management**
   - Store dietary restrictions (array of strings)
   - Store household size (integer, default 2)
   - Store voice language (string, default "en")
   - Store voice accent (string, default "en-US")
   - Create user settings on demand or upsert
   - Load user settings for context

3. **User Profile Retrieval**
   - Fetch current user info (id, email only)
   - Fetch user settings
   - User isolation (only own settings visible)

---

## Current Implementation Map

### Database Layer

**File:** `shared/schema.ts`

| Table | Responsibility | Fields | Classification |
|-------|-----------------|--------|-----------------|
| `users` | User account storage | id, email (unique), passwordHash, createdAt | **Persistence** |
| `sessions` | Session token storage | id, userId, token (unique), expiresAt, createdAt | **Persistence** |
| `user_settings` | User preferences | id, userId (unique), dietaryRestrictions[], householdSize, voiceLanguage, voiceAccent, createdAt, updatedAt | **Persistence** |

### Server Layer

**File:** `server/auth.ts`

| Function | Responsibility | Parameters | Classification |
|----------|-----------------|------------|-----------------|
| `hashPassword()` | Hash password with bcrypt (salt: 10) | password string | **Infrastructure** (cryptographic service) |
| `comparePassword()` | Timing-safe password comparison | password, hash | **Infrastructure** (cryptographic service) |
| `generateSessionToken()` | Create 32-byte random hex token | none | **Infrastructure** (token generation) |
| `createSession()` | Insert session to database with 7-day expiration | userId | **Capability** (session business logic) |
| `getSessionUser()` | Load user from valid, non-expired session | token | **Capability** (session validation) |
| `requireAuth()` | Middleware for protected endpoints | express middleware | **Interface** (HTTP middleware) |

**Authentication Flow (auth.ts):**
- User routes → requireAuth middleware → Session token from HttpOnly cookie → resolve database session ID and user → require `X-CSRF-Token` for authenticated POST/PATCH/DELETE requests → attach user to req.user

**File:** `server/routes.ts`

| Endpoint | Method | Responsibility | Location | Dependencies | Classification |
|----------|--------|-----------------|----------|--------------|-----------------|
| `/api/auth/signup` | POST | Register new user | Line 74 | authRateLimiter, validateInput, hashPassword, createSession, CSRF token, secure cookie | **Interface** (HTTP transport) |
| `/api/auth/signin` | POST | Authenticate existing user | Line 108 | loginRateLimiter, validateInput, comparePassword, createSession, CSRF token, secure cookie | **Interface** (HTTP transport) |
| `/api/auth/signout` | POST | Terminate session | Line 155 | cookie session authentication, database delete, cookie clear, CSRF validation | **Interface** (HTTP transport) |
| `/api/auth/user` | GET | Fetch current user info | Line 166 | requireAuth, return user from req.user | **Interface** (HTTP transport) |
| `/api/user-settings` | GET | Fetch user settings | Line 268 | requireAuth, userId scoping | **Interface** (HTTP transport) |
| `/api/user-settings` | POST | Create or update user settings | Line 278 | requireAuth, validateInput, upsert logic | **Interface** (HTTP transport) |

**Signup Details (Line 74):**
- Input validation via `signupSchema`
- Check email uniqueness (query users table)
- Hash password via `hashPassword()`
- Insert user record
- Create session via `createSession()`
- Generate CSRF token via `createCsrfToken()`
- Set secure cookie via `res.cookie()`
- Return: user object and CSRF token; session token is set only in the HttpOnly cookie
- Error handling: 400 on validation, 400 on duplicate email, 500 on error

**Signin Details (Line 108):**
- Input validation via `signinSchema`
- Query user by email (generic error prevents enumeration)
- Compare password via `comparePassword()`
- Create session via `createSession()`
- Generate CSRF token
- Set secure cookie
- Return: user object and CSRF token; session token is set only in the HttpOnly cookie
- Error handling: 401 on invalid email/password, 500 on error

**Signout Details (Line 155):**
- Extract token from the session cookie only
- Delete session from database
- Clear session cookie
- Return success response

**File:** `server/security.ts`

| Component | Responsibility | Current Implementation | Classification |
|-----------|-----------------|------------------------|-----------------|
| `createRateLimiter()` | Rate limit enforcement per IP | In-memory store, 60-1000ms windows, configurable limits | **Infrastructure** |
| `getClientIp()` | Extract client IP respecting proxies | Checks X-Forwarded-For, CF-Connecting-IP, socket address | **Infrastructure** |
| `getSecureCookieOptions()` | Secure cookie configuration | HttpOnly=true, Secure=(production), SameSite=strict | **Infrastructure** |
| `createCsrfToken()` | CSRF token generation | crypto.randomBytes(32).toString('hex'), 1-hour TTL | **Infrastructure** |

**Secure Cookie Options:**
- HttpOnly: true (XSS protection)
- Secure: true in production only (HTTPS enforcement)
- SameSite: strict (CSRF protection)
- MaxAge: 7 * 24 * 60 * 60 * 1000 (7 days)
- Path: /

### Client Layer

**File:** `client/src/components/Auth.tsx`

| Responsibility | Implementation | Classification |
|-----------------|-----------------|-----------------|
| Authentication form UI | Separate signup and signin tabs | **Interface** (presentation) |
| Email input | Email validation field with error display | **Interface** (input) |
| Password input | Password validation field with requirements help text | **Interface** (input) |
| Form submission | Call login() or signup() from UserContext | **Interface** (transport) |
| Input validation | Client-side Zod schema validation | **Interface** (validation) |
| Error handling | Display Zod validation errors as field-level feedback | **Interface** (error display) |
| Loading state | Disable button during submission | **Interface** (UX) |

**File:** `client/src/contexts/UserContext.tsx`

| Function | Responsibility | Implementation | Classification |
|----------|-----------------|-----------------|-----------------|
| `checkAuth()` | Session persistence on page load | GET /api/auth/user with cookies included, set user state or clear CSRF state | **Conversation** (application state) |
| `login()` | Authenticate user | POST /api/auth/signin, store CSRF token in sessionStorage, set user state | **Conversation** (application state) |
| `signup()` | Register new user | POST /api/auth/signup, store CSRF token in sessionStorage, set user state | **Conversation** (application state) |
| `logout()` | Terminate session | POST /api/auth/signout with cookie, clear CSRF state and user state | **Conversation** (application state) |

**UserContext State:**
- `user`: Current authenticated user (id, email) or null
- `loading`: Boolean indicating auth check in progress
- `login()`, `signup()`, `logout()`: Functions for auth operations

**Browser Credential Storage:**
- The session token is held only in the HttpOnly `session_token` cookie and is inaccessible to JavaScript.
- The session-bound CSRF token is stored in sessionStorage and sent in `X-CSRF-Token` on authenticated mutations.
- A legacy `sage_auth_token` localStorage value is removed when the app starts.

**File:** `client/src/lib/api.ts`

| Function | Responsibility | Implementation |
|----------|-----------------|-----------------|
| `getCsrfToken()` / `setCsrfToken()` | Read/write CSRF token | sessionStorage key `sage_csrf_token` |
| `apiRequest()` | Send authenticated API requests | Includes cookies; adds `X-CSRF-Token` for authenticated mutations |

---

## Database Ownership

### `users` Table

**Purpose:** Central user account registry

**Fields:**
- `id` (uuid, primary key): User identifier
- `email` (text, unique, not null): Email address for login
- `passwordHash` (text, not null): Bcrypt hash of password
- `createdAt` (timestamp): Account creation time

**Access Pattern:**
- Query by email for login lookups
- Query by id when loading from session
- No cascade deletes (sessions and user_settings would remain)
- Email uniqueness enforced at database level (unique constraint)

---

### `sessions` Table

**Purpose:** Session token management for multi-device access

**Fields:**
- `id` (uuid, primary key): Session identifier
- `userId` (uuid, not null): References user account
- `token` (text, unique, not null): Cryptographic token for authentication
- `expiresAt` (timestamp, not null): Session expiration time
- `createdAt` (timestamp): Session creation time

**Access Pattern:**
- Query by token for each authenticated request
- Check expiration on each query
- Delete on logout
- Cleanup: Old expired sessions not automatically deleted (potential data growth)

---

### `user_settings` Table

**Purpose:** User preferences and configuration

**Fields:**
- `id` (uuid, primary key): Settings identifier
- `userId` (uuid, unique, not null): References user account (one-to-one)
- `dietaryRestrictions` (text[], default=[]): Dietary filters (vegan, gluten_free, etc.)
- `householdSize` (integer, default=2): Number of people in household
- `voiceLanguage` (text, default='en'): Speech recognition language
- `voiceAccent` (text, default='en-US'): TTS voice variant
- `createdAt` (timestamp): When settings created
- `updatedAt` (timestamp): When settings last modified

**Access Pattern:**
- Query by userId (one-to-one relationship)
- Create on first access (lazy initialization)
- Update on settings change (upsert logic)
- No automatic deletion

**Relationship to Other Capabilities:**
- Used by Pantry capability (dietary restrictions for meal suggestions)
- Used by Shopping capability (household size for recipe portions)
- Used by Recipes capability (dietary and portion filtering)

---

## External Dependencies

### Cryptographic Libraries

| Library | Used For | Classification |
|---------|----------|-----------------|
| `bcryptjs` | Password hashing (10 salt rounds) | **Infrastructure** |
| `crypto` (Node.js built-in) | Session token generation (32 bytes) | **Infrastructure** |

### Validation

| Library | Used For | Classification |
|---------|----------|-----------------|
| `zod` | Input schema validation (signup, signin, user-settings) | **Interface** |

### Express Middleware

| Middleware | Used For | Classification |
|------------|----------|-----------------|
| `cookie-parser` | Parse session_token from request.cookies | **Infrastructure** |
| `express.json()` | Parse request body | **Infrastructure** |

### Browser APIs

| API | Used For | Classification |
|-----|----------|-----------------|
| `sessionStorage` | Store session-bound CSRF token | **Infrastructure** |
| `fetch()` / HTTP | HTTP requests to auth endpoints | **Infrastructure** |

---

## Interactions With Other Capabilities

### Authentication → Pantry Capability

**Dependency:** Authorization

- All Pantry endpoints require `requireAuth` middleware
- Pantry queries filtered by `userId` from req.user
- User isolation enforced at each Pantry operation
- User cannot access another user's pantry items

**Current Implementation:**
- `requireAuth` middleware in all Pantry routes
- `WHERE userId = req.user!.id` in all Pantry queries

---

### Authentication → Shopping Capability

**Dependency:** Authorization

- All Shopping endpoints require `requireAuth` middleware
- Shopping queries filtered by `userId` from req.user
- User isolation enforced at Shopping operations

---

### Authentication → User Settings Capability

**Dependency:** Association

- User settings created/updated after signup
- User settings fetched with `requireAuth` protection
- Settings scoped to authenticated user

---

### Users Settings → Pantry

**Dependency:** Context

- `dietaryRestrictions` passed to AI for meal suggestions
- `householdSize` passed to AI for recipe portions
- Settings used in `/api/pantry-assistant` endpoint context

---

### Users Settings → Shopping

**Dependency:** Context (indirect)

- Household size affects ingredient quantities in shopping list
- Via meal suggestions (Pantry → Shopping composition)

---

### Users Settings → Recipes

**Dependency:** Context

- Dietary restrictions filter available recipes
- Household size affects recipe portions

---

## Observations

1. **Authentication is tightly coupled to HTTP transport**: Signup and signin endpoints embed authentication logic, password hashing, session creation, and response formatting together. This couples business logic to Express middleware and cookie handling.

2. **Browser authentication is cookie-only**: The session token is stored in an HttpOnly cookie. The frontend does not store it in localStorage or send it as a Bearer token; the CSRF token is stored separately in sessionStorage.

3. **Rate limiting implemented as in-memory store**: In-memory rate limit store works for single server but is implemented as an in-memory store. No persistence of rate limit state across processes.

4. **CSRF protection is session-bound**: Authenticated POST, PATCH, and DELETE requests validate the CSRF token against the session resolved from the cookie. Signup and signin are pre-authentication exceptions.

5. **User settings use "upsert" pattern without explicit transaction**: Settings treated as optional (user may not have row immediately after signup). Upsert logic checks existence then updates or inserts—not atomic without explicit transaction.

6. **Session expiration is not enforced by background cleanup**: Old expired sessions remain in database indefinitely. Expiration checked on query but old records accumulate.

7. **Email uniqueness enforced at multiple layers**: Database constraint (unique) + application check before insert. Redundancy is safe but could be rationalized.

8. **User context propagated through Express req.user**: All downstream code accesses user through request object. No centralized user service abstraction.

9. **Authentication is prerequisite for all other capabilities**: No guest mode. Every operation (pantry, shopping, recipes) requires authenticated user. This is architectural dependency: User is foundational.

10. **Password validation requirements not enforced at schema level**: Signup accepts any non-empty password. Validation happens in Zod schema but only validates minimum length 8 characters and character diversity—no other rules.

11. **User settings are lazy-initialized**: Settings table may not have row for user immediately after signup. Each capability must handle null settings gracefully or create settings on demand.

12. **Sign-out requires the authenticated session cookie and CSRF token**: The session is deleted only after normal cookie authentication and CSRF validation.

---

## Summary

Authentication and Users capabilities handle:
- **User registration and login** with bcrypt password hashing and rate limiting
- **Session management** with 7-day expiration and HttpOnly cookie-based browser authentication
- **User settings** for preferences (dietary, household size, voice)

Key architectural points:
- **Required for all other capabilities**: Every operation depends on authentication
- **Cookie-only browser authentication**: Session cookie is HttpOnly; the CSRF token is separately stored in sessionStorage
- **Tight HTTP coupling**: Authentication logic mixed with Express routes
- **Optional user settings**: Created lazily or on demand
- **Foundational dependency**: Users is prerequisite for Pantry, Shopping, Recipes

The current implementation places authentication responsibilities across HTTP routes, middleware, persistence, and client application state.
