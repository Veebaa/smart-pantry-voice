# Sage - AI-Powered Pantry Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18-000000.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)


## Project Status

> **🚧 Sage is currently undergoing the Sage 2.0 modernisation.**

The existing application is fully functional and continues to be maintained while an incremental architectural migration is underway.

Sage 2.0 introduces a new architecture centred around:

- AI as an orchestrator rather than a source of business logic
- Deterministic business capabilities
- Application-managed conversation state
- Clear architectural boundaries
- Incremental, low-risk refactoring

The architectural design phase is complete and documented in:

```
docs/
├── architecture/
└── engineering/
```

Development is now focused on implementing the Sage 2.0 architecture through the migration plan.

## Why Sage?

Many AI applications embed business logic directly inside prompts, making them difficult to test, maintain, and evolve.

Sage takes a different approach.

AI is responsible for understanding user intent, while the application owns business logic, conversation management, and data integrity.

This separation creates a more maintainable, reliable, and extensible conversational application.

## Overview

Sage is an AI-powered pantry management assistant that combines conversational AI with deterministic business capabilities to help users manage food inventory, reduce waste, and discover meals using ingredients they already have.

Built with modern software engineering practices, Sage emphasises maintainability, security, and long-term architectural quality alongside a natural conversational user experience.

### Key Capabilities

- **Voice-Controlled Inventory**: Add and manage pantry items using natural voice commands
- **AI Meal Suggestions**: Get personalized recipe recommendations powered by conversational AI
- **Smart Categorization**: Automatic organization of items into fridge, freezer, cupboard, and pantry categories
- **Expiration Tracking**: Monitor expiring items with visual alerts and thresholds
- **Shopping Lists**: Auto-generated shopping lists from suggested recipes
- **Recipe Management**: Save favorite recipes and maintain a history with ratings and notes
- **Dietary Preferences**: Support for vegetarian, vegan, gluten-free, and other dietary restrictions
- **Text-to-Speech**: Natural audio responses from the AI assistant

## Project Goals

Sage aims to demonstrate how conversational AI applications can be designed using clear architectural boundaries rather than embedding business logic inside AI prompts.

The project prioritises:

- maintainability
- deterministic business behaviour
- long-term architecture
- incremental modernisation
- practical AI integration

The architecture is intentionally designed to remain independent of any specific AI provider or user interface.

## Technology Stack

### Architecture

- AI Orchestrator
- Capability Architecture
- Conversation Architecture
- Deterministic Business Capabilities
- Incremental Migration Strategy

### Frontend
- **React** 18.3 - UI framework with TypeScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Headless component library
- **TanStack React Query** - Server state management
- **React Router** - Client-side routing
- **React Hook Form** - Form state management

### Backend
- **Express.js** - HTTP server framework
- **Node.js** - JavaScript runtime
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe SQL query builder
- **bcryptjs** - Password hashing
- **Zod** - Runtime schema validation

### DevOps & Testing
- **Node.js** - Application runtime
- **npm** - Dependency installation using `package-lock.json`
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **GitHub Actions** - CI/CD pipeline
- **Replit** - Existing development/deployment configuration

## Security Architecture

This project implements OWASP security best practices:

- **Authentication**: Bcryptjs password hashing (10 salt rounds) with secure session tokens
- **Rate Limiting**: 5 req/min on auth endpoints, 10 req/15min on login attempts
- **CSRF Protection**: Token-based CSRF prevention with constant-time comparison
- **Secure Cookies**: HttpOnly, Secure (HTTPS), SameSite=Strict flags
- **Input Validation**: Zod schemas with sanitization against XSS/SQL injection
- **Security Headers**: X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy
- **Audit Logging**: Security event tracking for authentication failures and rate limits
- **Parameterized Queries**: Drizzle ORM prevents SQL injection
- **Error Handling**: Generic error messages prevent user enumeration

See [Security Architecture](#security-architecture-1) for detailed implementation.

## Prerequisites

- **Node.js** 22 (see `.nvmrc`)
- **npm**
- **PostgreSQL** 14+


## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/Veebaa/smart-pantry-voice.git
cd smart-pantry-voice

# Install dependencies
npm ci

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL URL and OpenAI API key

# Apply versioned Drizzle migrations
npm run db:migrate

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

### PostgreSQL schema and migrations

`shared/schema.ts` is the application schema. The checked-in `migrations/0000_initial_schema.sql` was generated from that schema. For a new, empty database, set `DATABASE_URL` in `.env` and run `npm run db:migrate` before starting the application.

When the Drizzle schema changes, generate and review a migration with `npm run db:generate`, then commit the SQL and metadata under `migrations/`. Apply reviewed migrations with `npm run db:migrate`. `db:push` is retained for local development only.

The initial migration is for an empty database. Do not run it against an existing database that already contains application tables unless that database has first been safely baselined against the migration history. Back up existing data and agree on a baseline/adoption plan before using versioned migrations on it. The setup steps above do not reset a database.

### Using Docker

```bash
docker build -t sage .
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your_key \
  -e DATABASE_URL=postgresql://... \
  sage
```

## Documentation

The project documentation is organised into two areas.

### Architecture

Defines the long-term design of Sage.

- Architecture Vision
- AI Orchestrator
- Capability Architecture
- Conversation Architecture
- Application Architecture
- Glossary

### Engineering

Defines how the architecture is implemented.

- Developer Guide
- Migration Plan

Contributors should familiarise themselves with these documents before making architectural or structural changes.

## API

The current HTTP API is implemented by the Express/Node.js backend. Endpoint contracts may evolve as the architecture develops; see the route implementations under `server/` for current behavior.

## Development

### Available Scripts

Scripts use npm and the committed `package-lock.json`:

```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run build              # Production build
npm run start              # Start production server

# Testing
npm test                    # Run unit tests
npm run test:watch          # Tests in watch mode
npm run test:coverage       # With coverage report
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # E2E tests with UI

# Database
npm run db:generate         # Generate migration from shared/schema.ts
npm run db:migrate          # Apply pending migrations
npm run db:push             # Development-only schema push; avoid in production
npm run db:studio           # Open Drizzle Studio

# Linting & Type Checking
npm run lint              # ESLint check
npm run type-check        # TypeScript check
```

The application uses Node.js; install dependencies reproducibly with `npm ci`.

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run `npm run lint` before committing.

## Testing

### Unit Tests
```bash
npm test -- tests/unit/server/security.test.ts
npm test -- tests/unit/server/itemClassifier.test.ts
```

### End-to-End Tests
```bash
# Start server first
npm run dev

# In another terminal
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Deployment

The active application architecture is React/Vite → Express/Node.js → PostgreSQL via Drizzle ORM, with OpenAI used by the server-side assistant and text-to-speech routes. npm is used for dependency installation and scripts. No production PostgreSQL database has been provisioned or verified, and production deployment is not currently confirmed.

For local development, configure `DATABASE_URL` and `OPENAI_API_KEY` in `.env` as described above. Production deployment instructions will be finalized after a hosting platform and database have been selected and verified. Do not treat the example values below as provisioned infrastructure.

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/sage
OPENAI_API_KEY=your_openai_key
```

## CI/CD Pipeline

GitHub Actions automatically runs on every push and pull request:

1. **Unit Tests** - Vitest with coverage
2. **Frontend Tests** - React Testing Library
3. **E2E Tests** - Playwright
4. **Lint Check** - ESLint
5. **Type Check** - TypeScript
6. **Build** - Production build verification

See `.github/workflows/ci.yml` for details.

## Security

### Best Practices Implemented

- ✅ **Password Security**: Minimum 8 characters with uppercase, lowercase, and numbers
- ✅ **Rate Limiting**: Prevents brute force attacks on auth endpoints
- ✅ **CSRF Protection**: Token-based CSRF prevention
- ✅ **XSS Prevention**: Input sanitization and Content Security Policy
- ✅ **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- ✅ **Secure Session Cookies**: HttpOnly, Secure, SameSite=Strict
- ✅ **Audit Logging**: Security event tracking
- ✅ **Error Handling**: Generic error messages prevent info leaks

### Security Testing

```bash
npm test -- tests/unit/server/security.test.ts
```

### Reporting Security Issues

Please report security vulnerabilities privately via GitHub or by contacting the project maintainer directly.

## Architecture Philosophy

Sage is built around a small number of long-term architectural principles.

- AI understands intent but does not contain business logic.
- Business capabilities remain deterministic and reusable.
- Conversation state belongs to the application rather than the AI model.
- Clear architectural boundaries improve maintainability.
- Simplicity is preferred over unnecessary abstraction.

These principles guide all future development and refactoring.

## Contributing

Before contributing significant architectural or structural changes, please read:

- docs/architecture/
- docs/engineering/developer-guide.md

This helps ensure all contributions remain consistent with the Sage architecture.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Request Guidelines

- Update tests for new features
- Ensure all tests pass (`npm test`)
- Update documentation as needed
- Follow code style guidelines (`npm run lint`)

## Performance

- **Frontend**: ~237KB gzipped (main bundle)
- **Load Time**: <2s on 4G
- **Database**: Optimized queries with Drizzle
- **Caching**: React Query for server state management

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### "Voice not working"
- Check microphone permissions in browser
- Verify OPENAI_API_KEY is set
- Check browser console for CORS errors

### "Database connection failed"
- Verify DATABASE_URL in .env
- Ensure PostgreSQL is running
- Check network connectivity

### "Port 5000 already in use"
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

## Sage 2.0 Migration Progress

| Phase | Status |
|--------|--------|
| Architecture & Documentation | ✅ Complete |
| Project Simplification | ⏳ Planned |
| Capability Foundation | ⏳ Planned |
| Conversation Architecture | ⏳ Planned |
| Application Boundaries | ⏳ Planned |
| Persistence Boundary | ⏳ Planned |
| Infrastructure Separation | ⏳ Planned |
| Testing & Validation | ⏳ Planned |

The migration is being carried out incrementally. The application remains functional throughout each phase.

## Author

- Veritia Corcoran - GitHub: https://github.com/Veebaa

---

**Last Updated**: August 2026  
**Version**: 1.0.0-alpha
