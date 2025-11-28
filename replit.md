# Sage - AI-Powered Pantry Assistant

## Overview
Sage is a voice-enabled pantry management application with AI meal suggestions. Migrated from Lovable/Supabase to Replit fullstack architecture with Express backend and PostgreSQL database.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Cookie-based sessions
- **AI Integration**: Lovable AI Gateway (Gemini 2.5 Flash) and OpenAI TTS

## Project Structure
```
/server
  - index.ts: Express server setup
  - routes.ts: API endpoints
  - auth.ts: Authentication middleware
  - db.ts: Database connection
  - vite.ts: Vite dev server integration

/client
  - src/: Frontend React application
  - src/components/: UI components
  - src/pages/: Page components
  - src/contexts/: React contexts (UserContext)
  - src/lib/: Utilities (API client)

/shared
  - schema.ts: Shared database schema and types

/db
  - migrations/: SQL migration files
```

## Features
1. **Voice Control**: Add/update pantry items using voice commands
2. **Smart Categorization**: Automatic categorization of items (fridge, freezer, cupboard, pantry)
3. **AI Meal Suggestions**: Personalized meal ideas based on available ingredients
4. **Low Stock Alerts**: Track items running low with customizable thresholds
5. **Shopping Lists**: Auto-generate shopping lists from meal suggestions
6. **Dietary Preferences**: Support for vegetarian, vegan, gluten-free, etc.

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/signin` - Login existing user
- POST `/api/auth/signout` - Logout user
- GET `/api/auth/user` - Get current user (requires auth)

### Pantry Items
- GET `/api/pantry-items` - Get all pantry items
- POST `/api/pantry-items` - Add new item
- PATCH `/api/pantry-items/:id` - Update item
- DELETE `/api/pantry-items/:id` - Delete item

### User Settings
- GET `/api/user-settings` - Get user settings
- POST `/api/user-settings` - Update user settings

### Favorite Recipes
- GET `/api/favorite-recipes` - Get favorite recipes
- POST `/api/favorite-recipes` - Add favorite recipe
- DELETE `/api/favorite-recipes/:id` - Delete favorite recipe

### AI Assistant
- POST `/api/pantry-assistant` - Process voice input and get AI response
- POST `/api/openai-tts` - Convert text to speech

## Environment Variables Required
The following API keys are needed for full functionality:

- `LOVABLE_API_KEY` - For AI assistant (Gemini 2.5 Flash via Lovable gateway)
- `OPENAI_API_KEY` - For text-to-speech functionality
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

## Security Features
- Bcrypt password hashing (bcryptjs for Replit compatibility)
- Cookie-based session management
- Session revocation on logout
- Input validation with Zod schemas
- Password requirements: min 8 chars, uppercase, lowercase, number
- Protected API endpoints with requireAuth middleware

## Database Schema

### pantry_items
- User's food inventory with categories and quantities
- Low stock tracking with customizable thresholds

### user_settings
- Dietary restrictions, household size
- Voice language and accent preferences

### favorite_recipes
- User's saved meal suggestions

### users
- Email and password authentication

### sessions
- Active user sessions

## Recent Changes (November 27, 2025)
- ✅ Fixed landing page logo where italic "g" was cut off (added pb-3 padding and line-height)
- ✅ Implemented comprehensive testing infrastructure
- ✅ Set up Vitest for unit tests with 28 passing tests covering auth validation and item classifier
- ✅ Created frontend component test files for Auth, Landing, and MealSuggestions
- ✅ Configured Playwright for E2E testing with auth flows and navigation scenarios
- ✅ Added test scripts: test, test:watch, test:coverage, test:client, test:e2e, test:e2e:ui
- ✅ Added GitHub Actions CI pipeline (.github/workflows/ci.yml)
- ✅ CI includes: unit tests, frontend tests, E2E tests, linting, type checking, and build verification

## Recent Changes (November 26, 2025)
- ✅ Fixed deployment health check timeout with lazy database initialization
- ✅ Server now starts listening immediately before loading routes/database
- ✅ Added /health endpoint for deployment health checks
- ✅ Database connects lazily on first API request (not on module import)
- ✅ Deployment target: Autoscale for stateless web application
- ✅ Updated favicon to sage leaf icon
- ✅ Redesigned logo with integrated sage leaf and gradient colors
- ✅ Added sticky header with "Get Started" button on landing page
- ✅ Created floating voice button accessible from any tab
- ✅ Added empty state guidance for new users with sample commands
- ✅ Added quick manual add dialog for pantry items
- ✅ Added dark mode toggle with localStorage persistence

## Recent Changes (November 25, 2025)
- ✅ Migrated from Supabase to PostgreSQL with Drizzle ORM
- ✅ Replaced Supabase Auth with cookie-based authentication
- ✅ Converted Edge Functions to Express API routes
- ✅ Updated all frontend components to use new API client
- ✅ Fixed security issues: session revocation, PATCH validation, password policy
- ✅ Replaced bcrypt with bcryptjs for Replit compatibility
- ✅ Server running successfully on port 5000
- ✅ Implemented smart item categorization with keyword priority and ambiguity detection
- ✅ Added duplicate prevention for pantry items
- ✅ Classification validates/overrides AI-provided categories
- ✅ Added expiration date tracking with visual alerts
- ✅ Implemented batch voice commands ("add milk, eggs, and butter")
- ✅ Added undo functionality for pantry operations
- ✅ Built recipe history feature with ratings and notes
- ✅ Added "Suggest Meals" button for click-based meal suggestions (alternative to voice)
- ✅ Added "Cook This" button to save selected recipes to history tab

## Deployment Configuration
- **Target**: Autoscale (stateless web application)
- **Build**: `bun run build` (compiles TypeScript to dist/)
- **Run**: `bun run start` (NODE_ENV=production node dist/server/index.js)
- **Port**: 5000 → 80 (external)
- **Health Check**: Both `/` and `/health` respond immediately before routes load
- **Static Files**: Served synchronously at startup (before server.listen)
- **Database**: Connects lazily on first API request

## Next Steps
1. Deploy the application (click Publish button)
2. Request API keys from user if needed (LOVABLE_API_KEY, OPENAI_API_KEY)
3. Test voice assistant functionality
4. Test text-to-speech features

## Development
```bash
# Start development server
bun run dev

# Run database migrations
bun run db:push

# View database in Drizzle Studio
bun run db:studio
```

## Testing
```bash
# Run all unit tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run frontend component tests
bun run test:client

# Run E2E tests (requires server running)
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

### Test Structure
```
/tests
  - unit/server/           # Backend unit tests
    - auth.test.ts         # Password/email validation, session tokens
    - itemClassifier.test.ts # Smart categorization logic
  - e2e/                   # Playwright E2E tests
    - auth.spec.ts         # Authentication flow tests
    - navigation.spec.ts   # Landing page and navigation tests
  - setup.ts               # Server test setup
  - client-setup.ts        # Frontend test setup

/client/src/__tests__      # Frontend component tests
  - Auth.test.tsx          # Auth component tests
  - Landing.test.tsx       # Landing page tests
  - MealSuggestions.test.tsx # Meal suggestions tests
```

## CI/CD with GitHub Actions
The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on:
- Push to main/master branches
- Pull requests to main/master branches

**Jobs:**
1. **unit-tests** - Runs Vitest unit tests with coverage
2. **frontend-tests** - Runs frontend component tests
3. **e2e-tests** - Runs Playwright E2E tests
4. **lint** - Runs ESLint
5. **typecheck** - Runs TypeScript type checking
6. **build** - Builds the production application

**Artifacts:**
- Coverage reports (7 days retention)
- Playwright HTML reports (30 days retention)
- Playwright screenshots on failure (7 days retention)

## Security Architecture

### 🔐 Authentication & Authorization
- **Password Hashing**: bcryptjs with 10 salt rounds (resistant to rainbow tables)
- **Session Tokens**: Cryptographically secure 32-byte tokens (64 hex chars)
- **Session Duration**: 7 days with automatic expiration
- **Cookie Configuration**: 
  - HttpOnly (prevents JavaScript access - XSS protection)
  - Secure (HTTPS only in production)
  - SameSite=Strict (prevents CSRF attacks)

### 🛡️ API Security
- **Rate Limiting**: 
  - Auth endpoints: 5 requests/minute per IP
  - Login attempts: 10 requests/15 minutes per IP (stricter)
- **Input Validation**: Zod schemas with type-safe parsing
- **Input Sanitization**: HTML entity escaping, email/string/number validation
- **CSRF Protection**: Token-based CSRF prevention with 1-hour expiration
- **Security Headers**:
  - X-Frame-Options: DENY (clickjacking prevention)
  - X-Content-Type-Options: nosniff (MIME sniffing prevention)
  - CSP: Strict content security policy
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: Disabled for geolocation, microphone, camera

### 🔏 Data Protection
- **Password Requirements**: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
- **Error Messages**: Generic error messages prevent user enumeration
- **Timing-Safe Comparisons**: bcrypt.compare is timing-safe
- **Parameterized Queries**: Drizzle ORM prevents SQL injection
- **Environment Variables**: All secrets stored in .env, never hardcoded

### 🧪 Security Testing
Run security-focused tests:
```bash
bun run test tests/unit/server/security.test.ts
```

Tests cover:
- CSRF token generation and validation
- Input sanitization (XSS, SQL injection prevention)
- Secure cookie configuration
- Attack prevention (email enumeration, injection attacks)

### 📊 Audit Logging
Security events logged for:
- Authentication failures
- Rate limit violations
- CSRF failures
- Validation errors

Logs kept for audit trail analysis (last 1000 events in memory, integrate with external service for production).

## Notes
- The voice assistant uses the Lovable AI Gateway (Gemini 2.5 Flash model)
- Text-to-speech uses OpenAI's TTS API
- Browser may cache old code - do a hard refresh (Ctrl+Shift+R) if issues occur
- All API endpoints require authentication except signup/signin
- **OWASP Compliance**: Implementation follows OWASP Top 10 best practices
- For production deployment, integrate external logging (Sentry, LogRocket) for security event monitoring
