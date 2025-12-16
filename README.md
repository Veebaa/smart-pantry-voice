# Sage - AI-Powered Pantry Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18-000000.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

## Overview

Sage is a sophisticated voice-controlled pantry management application that leverages AI to provide intelligent meal suggestions based on your available ingredients. Built with modern security practices and a focus on user experience, Sage helps you manage your food inventory, reduce waste, and discover recipes from what you already have.

### Key Capabilities

- **Voice-Controlled Inventory**: Add and manage pantry items using natural voice commands
- **AI Meal Suggestions**: Get personalized recipe recommendations powered by Gemini 2.5 Flash
- **Smart Categorization**: Automatic organization of items into fridge, freezer, cupboard, and pantry categories
- **Expiration Tracking**: Monitor expiring items with visual alerts and thresholds
- **Shopping Lists**: Auto-generated shopping lists from suggested recipes
- **Recipe Management**: Save favorite recipes and maintain a history with ratings and notes
- **Dietary Preferences**: Support for vegetarian, vegan, gluten-free, and other dietary restrictions
- **Text-to-Speech**: Natural audio responses from the AI assistant

## Technology Stack

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

- **Node.js** 18+ or **Bun** 1.0+
- **PostgreSQL** 14+
- **npm** or **bun** package manager
- API keys:
  - `LOVABLE_API_KEY` - For AI meal suggestions (Gemini 2.5 Flash)
  - `OPENAI_API_KEY` - For text-to-speech functionality

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/sage.git
cd sage

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

## Project Structure

```
sage/
├── client/
│   └── src/
│       ├── components/          # React components
│       │   ├── ui/              # shadcn/ui components
│       │   ├── Landing.tsx       # Landing page
│       │   ├── Auth.tsx          # Authentication flow
│       │   └── ...
│       ├── pages/               # Page components
│       ├── contexts/            # React contexts (UserContext)
│       ├── lib/                 # Utilities
│       │   ├── queryClient.ts    # React Query setup
│       │   └── api.ts            # API client
│       ├── hooks/               # Custom React hooks
│       └── App.tsx              # Root component
│
├── server/
│   ├── index.ts                 # Express app setup
│   ├── routes.ts                # API endpoints
│   ├── auth.ts                  # Authentication utilities
│   ├── security.ts              # Security middleware
│   ├── validators.ts            # Input validation schemas
│   ├── itemClassifier.ts        # AI item categorization
│   ├── db.ts                    # Database connection
│   └── vite.ts                  # Vite integration
│
├── shared/
│   └── schema.ts                # Database schema & types
│
├── tests/
│   ├── unit/
│   │   └── server/              # Backend unit tests
│   ├── e2e/                     # Playwright E2E tests
│   └── setup.ts                 # Test configuration
│
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD
│
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

#### Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Logout
```http
POST /api/auth/signout
```

#### Get Current User
```http
GET /api/auth/user
Authorization: Bearer <session_token>
```

### Pantry Items Endpoints

#### Get All Items
```http
GET /api/pantry-items
Authorization: Bearer <session_token>
```

#### Add Item
```http
POST /api/pantry-items
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "name": "Milk",
  "quantity": 1,
  "unit": "l",
  "category": "fridge",
  "expiryDate": "2024-12-31T23:59:59Z",
  "notes": "Whole milk"
}
```

#### Update Item
```http
PATCH /api/pantry-items/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "quantity": 0.5,
  "notes": "Half used"
}
```

#### Delete Item
```http
DELETE /api/pantry-items/:id
Authorization: Bearer <session_token>
```

### Meal Suggestions
```http
POST /api/pantry-assistant
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "userMessage": "What can I make with milk, eggs, and flour?"
}
```

### User Settings
```http
GET /api/user-settings
PATCH /api/user-settings
```

## Development

### Available Scripts

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

### Deploy to Replit

1. Push code to GitHub
2. Connect repository to Replit
3. Click "Publish" button

### Deploy to Production

```bash
# Build
bun run build

# Deploy built files and run production server
NODE_ENV=production bun run start
```

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

Please report security vulnerabilities to [security contact]. Do not open public issues for security problems.

## Contributing

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

## Roadmap

- [ ] Meal plan generation (weekly/monthly)
- [ ] Nutrition tracking
- [ ] Recipe difficulty ratings
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Integration with grocery delivery services

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Gemini 2.5 Flash** - AI meal suggestions via Lovable AI Gateway
- **OpenAI** - Text-to-speech functionality
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling framework

## Support

For support, email [support@example.com] or open an issue on GitHub.

## Authors

- Your Name - [@github_username](https://github.com/github_username)

---

**Last Updated**: December 2024  
**Version**: 1.0.0
