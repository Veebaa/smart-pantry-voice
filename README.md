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
- **Wouter** - Lightweight routing
- **React Hook Form** - Form state management

### Backend
- **Express.js** - HTTP server framework
- **Node.js** - JavaScript runtime
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe SQL query builder
- **bcryptjs** - Password hashing
- **Zod** - Runtime schema validation

### DevOps & Testing
- **Bun** - Fast JavaScript runtime and package manager
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **GitHub Actions** - CI/CD pipeline
- **Replit** - Development and deployment platform

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

- **Bun** 1.0+ (package manager and runtime)
- **PostgreSQL** 14+


## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/Veebaa/smart-pantry-voice.git
cd smart-pantry-voice

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database URL

# Run database migrations
bun run db:push

# Start development server
bun run dev
```

The application will be available at `http://localhost:5000`

### Using Docker

```bash
docker build -t sage .
docker run -p 5000:5000 \
  -e LOVABLE_API_KEY=your_key \
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

The HTTP API is currently undergoing architectural modernisation as part of Sage 2.0.

Endpoint documentation will be published separately once the migration is complete.

During the migration, the application remains fully functional, but endpoint contracts may evolve as architectural boundaries are introduced.

## Development

### Available Scripts

All scripts use **Bun**:

```bash
# Development
bun run dev                 # Start dev server with hot reload
bun run build              # Production build
bun run start              # Start production server

# Testing
bun run test               # Run all tests
bun run test:watch        # Tests in watch mode
bun run test:coverage     # With coverage report
bun run test:e2e          # Playwright E2E tests
bun run test:e2e:ui       # E2E tests with UI

# Database
bun run db:push           # Apply schema changes
bun run db:pull           # Pull schema from database
bun run db:studio         # Open Drizzle Studio

# Linting & Type Checking
bun run lint              # ESLint check
bun run type-check        # TypeScript check
```

**Note**: This project uses **Bun** exclusively. Only `bun.lock` and `bun.lockb` are committed. Do not use npm or yarn.

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run `bun run lint` before committing.

## Testing

### Unit Tests
```bash
bun run test tests/unit/server/security.test.ts
bun run test tests/unit/server/itemClassifier.test.ts
```

### End-to-End Tests
```bash
# Start server first
bun run dev

# In another terminal
bun run test:e2e
```

### Test Coverage
```bash
bun run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Deployment

Deployment documentation will evolve alongside the Sage 2.0 migration.

The target deployment architecture is documented within the engineering documentation.

Current deployment instructions remain applicable until the migration is complete.

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/sage
LOVABLE_API_KEY=your_lovable_key
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
bun run test tests/unit/server/security.test.ts
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
- Ensure all tests pass (`bun run test`)
- Update documentation as needed
- Follow code style guidelines (`bun run lint`)

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
- Verify LOVABLE_API_KEY is set
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
